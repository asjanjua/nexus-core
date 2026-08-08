/**
 * Signed OAuth state shared by every connector install/callback route.
 *
 * The state carries the workspace id, the initiating user, and a single-use
 * nonce through the provider round trip, HMAC-SHA256 signed with a
 * purpose-derived subkey so callbacks can reject forged, replayed, or
 * cross-user redirects.
 *
 * WHY THE USER ID AND NONCE ARE HERE
 * ----------------------------------
 * A state that proves only "this server signed it, recently" is not enough. An
 * attacker could start an install for THEIR workspace, capture the signed
 * state, and get a victim to complete the provider consent screen with it — at
 * which point the victim's SharePoint or QuickBooks tokens are stored against
 * the attacker's workspace. That is the standard OAuth login-CSRF /
 * account-linking attack, and the payload here is a customer's document store.
 *
 * Binding to `userId` means the callback can require the authenticated caller
 * to be the person who started the install. Burning the `nonce` means a state
 * cannot be replayed inside its ten-minute lifetime.
 *
 * See docs/PR_REVIEW_2026-08-08.md §5.5.
 */

import crypto from "crypto";
import { z } from "zod";
import { signHmacHexFor, timingSafeEqualString } from "@/lib/security";

/** HKDF label. Bump the version to invalidate every in-flight install at once. */
const STATE_KEY_PURPOSE = "connector-oauth-state-v1";

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * The payload is parsed, not cast.
 *
 * The previous version did `JSON.parse(...) as ConnectorStatePayload`, so a
 * payload missing `ts` produced `Date.now() - undefined === NaN`, and
 * `NaN > STATE_MAX_AGE_MS` is false — the expiry check passed. Only reachable
 * with a valid signature, but a signature is not a schema.
 */
/**
 * Which kind of identity started the install.
 *
 * This exists because `AuthContext.userId` is not always a Clerk user. For a
 * bearer-token caller `lib/api-auth.ts` sets it to `payload.keyId` — an API key
 * id. Binding the callback to "the Clerk session must equal state.userId" would
 * therefore have broken every install started with an API token: the state
 * carries a key id, the callback resolves a Clerk user id, and they can never
 * match.
 *
 * So the state records what it was issued to. `clerk` states are bound to the
 * session at the callback. `api-key` states cannot be, and fall back to nonce +
 * expiry, which is what they had before. Recorded rather than inferred so the
 * callback is never guessing.
 */
const identityKindSchema = z.enum(["clerk", "api-key"]);
export type ConnectorIdentityKind = z.infer<typeof identityKindSchema>;

const statePayloadSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  // Optional for one release: states issued before this field existed are still
  // in flight for up to ten minutes. Treated as "api-key" (the weaker,
  // unbindable case) so an old state is never rejected outright mid-install.
  // Make it required once the ten-minute window from deploy has passed.
  identityKind: identityKindSchema.optional(),
  nonce: z.string().min(1),
  ts: z.number().int().positive(),
});

export type ConnectorStatePayload = z.infer<typeof statePayloadSchema>;

/**
 * Nonces already redeemed, mapped to the time they expire.
 *
 * In-process only, which is a deliberate limitation worth naming: on a
 * multi-instance deployment a replay that lands on a different instance is not
 * caught here. It still has to beat the ten-minute window and the userId bind,
 * so this closes the cheap replay and the remaining gap is documented rather
 * than pretended away. Promote to a `connector_oauth_nonces` table when the
 * install volume justifies the write.
 */
const consumedNonces = new Map<string, number>();

function pruneConsumedNonces(now: number): void {
  for (const [nonce, expiresAt] of consumedNonces) {
    if (expiresAt <= now) consumedNonces.delete(nonce);
  }
}

function sign(encoded: string): string {
  return signHmacHexFor(STATE_KEY_PURPOSE, encoded);
}

export function signConnectorState(
  workspaceId: string,
  userId: string,
  identityKind: ConnectorIdentityKind = "clerk"
): string {
  const payload: ConnectorStatePayload = {
    workspaceId,
    userId,
    identityKind,
    nonce: crypto.randomBytes(16).toString("base64url"),
    ts: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verify a state without consuming its nonce.
 *
 * Use `consumeConnectorState` in callback routes. This variant exists for
 * callers that need to inspect a state before deciding whether to act on it,
 * and for tests.
 */
export function verifyConnectorState(state: string): ConnectorStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  if (!timingSafeEqualString(sign(encoded), sig, "hex")) return null;

  try {
    const parsed = statePayloadSchema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString())
    );
    if (!parsed.success) return null;
    if (Date.now() - parsed.data.ts > STATE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Verify a state, bind it to the authenticated caller, and burn its nonce.
 *
 * This is what callback routes should call. Returns null on any of: bad
 * signature, malformed payload, expired, replayed, or a caller who is not the
 * user that started the install.
 *
 * `expectedUserId` is optional only so the migration can proceed route by
 * route. Passing it is the point of the function — a callback that omits it
 * keeps the replay protection but not the cross-user bind.
 */
export function consumeConnectorState(
  state: string,
  expectedUserId?: string
): ConnectorStatePayload | null {
  const payload = verifyConnectorState(state);
  if (!payload) return null;

  // Only a Clerk-issued state can be bound to a Clerk session. An api-key state
  // (or a pre-upgrade state with no identityKind) carries a key id that no
  // session will ever match, so enforcing the comparison there would refuse
  // every legitimate token-initiated install rather than stopping an attack.
  const bindable = payload.identityKind === "clerk";
  if (bindable && expectedUserId !== undefined && payload.userId !== expectedUserId) {
    return null;
  }

  const now = Date.now();
  pruneConsumedNonces(now);
  if (consumedNonces.has(payload.nonce)) return null;
  consumedNonces.set(payload.nonce, payload.ts + STATE_MAX_AGE_MS);

  return payload;
}

/** Exposed for tests. Nonce state is process-global and would leak between cases. */
export function __resetConsumedNoncesForTests(): void {
  consumedNonces.clear();
}
