/**
 * Connector lookup and access-token freshness shared by connector
 * files/ingest routes.
 *
 * Every OAuth connector stores `accessToken`/`refreshToken`/`expiresIn`/
 * `obtainedAt` credentials and refreshes them the same way; providers only
 * differ in the refresh call and in the extra credential fields (Jira
 * `cloudId`, QuickBooks `realmId`, LinkedIn `defaultOrgUrn`) they need
 * alongside the token.
 */

import { repository, type ConnectorRecord } from "@/lib/data/repository";
import { captureDegradedState, captureHandledError } from "@/lib/observability/sentry";

export type RefreshedTokens = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
};

export type ConnectorAuth<
  R extends string = never,
  O extends string = never,
> = { accessToken: string } & Record<R, string> & Partial<Record<O, string>>;

const EXPIRY_BUFFER_SECONDS = 60;

/**
 * In-flight refreshes, keyed by `workspaceId:type`.
 *
 * First of two layers of serialisation. This one dedupes concurrent callers
 * inside a single Node process, which is the common case (an ingest route and
 * a cron sync firing together on the same instance) and costs nothing. The
 * advisory lock below covers the cross-instance case that this cannot see.
 *
 * Entries are deleted in a `finally`, so a failed refresh does not pin a
 * rejected promise that every later caller would then inherit.
 */
const inFlightRefreshes = new Map<string, Promise<string | null>>();

/**
 * Hard cap on the provider's token endpoint.
 *
 * This call happens while an advisory lock is held, which means a pooled
 * Postgres connection is sitting in an open transaction for the duration. An
 * unbounded call there is a pool-exhaustion and
 * `idle_in_transaction_session_timeout` hazard, so the bound is the caller's
 * responsibility rather than something to leave to the network stack's
 * defaults. Ten seconds is generous for an OAuth token endpoint; a provider
 * slower than that is already failing.
 */
const CONNECTOR_REFRESH_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getActiveConnector(
  workspaceId: string,
  type: string
): Promise<ConnectorRecord | null> {
  const connectors = await repository.listConnectors(workspaceId);
  const connector = connectors.find((c) => c.type === type);
  if (!connector || connector.status !== "active") return null;
  return connector;
}

function isFresh(obtainedAt?: string, expiresIn?: number): boolean {
  if (!obtainedAt || !expiresIn) return false;
  const expiresAt =
    new Date(obtainedAt).getTime() + (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;
  return Date.now() < expiresAt;
}

/**
 * Returns a usable access token for the connector, refreshing it first when
 * it has expired and a refresh token is stored. Returns null when no usable
 * token can be produced.
 *
 * `requiredCredentials` fields must be present or the connector is treated as
 * unusable; `optionalCredentials` are returned when present.
 * `treatMissingExpiryAsFresh` covers providers whose tokens do not expire
 * (classic GitHub OAuth app tokens).
 */
export async function getValidConnectorAuth<
  R extends string = never,
  O extends string = never,
>(params: {
  workspaceId: string;
  type: string;
  refreshAccessToken: (refreshToken: string) => Promise<RefreshedTokens>;
  requiredCredentials?: readonly R[];
  optionalCredentials?: readonly O[];
  treatMissingExpiryAsFresh?: boolean;
}): Promise<ConnectorAuth<R, O> | null> {
  const { workspaceId, type } = params;
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;

  if (!accessToken) return null;

  const extras: Record<string, string> = {};
  for (const key of params.requiredCredentials ?? []) {
    const value = creds[key];
    if (typeof value !== "string") return null;
    extras[key] = value;
  }
  for (const key of params.optionalCredentials ?? []) {
    const value = creds[key];
    if (typeof value === "string") extras[key] = value;
  }

  const auth = (accessTokenValue: string) =>
    ({ ...extras, accessToken: accessTokenValue }) as ConnectorAuth<R, O>;

  if (isFresh(obtainedAt, expiresIn)) {
    return auth(accessToken);
  }

  if (params.treatMissingExpiryAsFresh && !expiresIn) {
    return auth(accessToken);
  }

  if (refreshToken) {
    const refreshed = await serialisedRefresh(
      workspaceId,
      type,
      params.refreshAccessToken
    );
    return refreshed ? auth(refreshed) : null;
  }

  // Expired, and no refresh token to do anything about it. The token is
  // returned anyway rather than null because some providers issue tokens that
  // outlive their declared `expires_in`, and the caller's request failing with
  // the provider's own 401 is more diagnosable than a blanket
  // "connector not active". Reported so a connector stuck in this state is
  // visible rather than silently degrading every request.
  captureDegradedState("access token is expired and no refresh token is stored", {
    route: "connectors.shared.getValidConnectorAuth",
    errorType: "connector_token_expired_unrefreshable",
    workspaceId,
    extra: { connectorType: type },
  });
  return auth(accessToken);
}

/**
 * Perform exactly one token refresh for a given connector at a time.
 *
 * Two layers, because they solve different halves of the same problem:
 *
 *   1. `inFlightRefreshes` dedupes callers within this Node process.
 *   2. `repository.withAdvisoryLock` serialises across Render instances.
 *
 * Inside the lock the credentials are re-read, because the whole point is that
 * another caller may have refreshed while this one waited. Skipping that
 * re-read would make the lock decorative: every waiter would still fire its own
 * refresh with the now-retired token the moment it acquired the lock.
 *
 * Returns the usable access token, or null when the refresh failed.
 */
async function serialisedRefresh(
  workspaceId: string,
  type: string,
  refreshAccessToken: (refreshToken: string) => Promise<RefreshedTokens>
): Promise<string | null> {
  const key = `${workspaceId}:${type}`;
  const existing = inFlightRefreshes.get(key);
  if (existing) return existing;

  // The promise is registered BEFORE the work starts, via a deferred handle.
  // Building it as `const run = (async () => {...})()` and setting the map
  // afterwards happens to work only because the body suspends at its first
  // await — if it ever completed synchronously, the `finally` would delete the
  // key before it was ever set and leave a permanently stale entry. Not a
  // property worth depending on.
  let settle!: (value: string | null) => void;
  const handle = new Promise<string | null>((resolve) => {
    settle = resolve;
  });
  inFlightRefreshes.set(key, handle);

  const run = (async (): Promise<string | null> => {
    try {
      return await repository.withAdvisoryLock(
        `connector-refresh:${key}`,
        async () => {
          // Re-read INSIDE the lock. Another instance may have already
          // refreshed while this one was queued, in which case reusing its
          // token is both correct and free.
          const fresh = await repository.getConnectorCredentials(workspaceId, type);
          if (!fresh) return null;

          const currentToken = fresh.accessToken as string | undefined;
          const currentRefresh = fresh.refreshToken as string | undefined;
          if (
            currentToken &&
            isFresh(
              fresh.obtainedAt as string | undefined,
              fresh.expiresIn as number | undefined
            )
          ) {
            return currentToken;
          }
          if (!currentRefresh) return currentToken ?? null;

          // Bounded: this runs inside the advisory lock, so an unbounded
          // provider call would pin a Postgres connection in an open
          // transaction for as long as the provider is slow.
          const newTokens = await withTimeout(
            refreshAccessToken(currentRefresh),
            CONNECTOR_REFRESH_TIMEOUT_MS,
            `${type} token refresh`
          );
          await repository.upsertConnector({
            workspaceId,
            type,
            // Preserve who actually installed the connector. This used to be
            // overwritten with the literal "token-refresh" on every refresh,
            // which quietly destroyed the install attribution that the
            // evidence audit trail depends on.
            installedBy: (fresh.installedBy as string | undefined) ?? "token-refresh",
            credentials: {
              ...fresh,
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token ?? currentRefresh,
              scope: newTokens.scope ?? fresh.scope,
              expiresIn: newTokens.expires_in,
              obtainedAt: new Date().toISOString(),
              lastRefreshedAt: new Date().toISOString(),
            },
          });
          return newTokens.access_token;
        }
      );
    } catch (error) {
      // Callers intentionally receive null so they can return a safe
      // connector-not-active response; preserve that fallback while making
      // refresh failures observable.
      captureHandledError(error, {
        route: "connectors.shared.getValidConnectorAuth",
        errorType: "connector_token_refresh_failed",
        workspaceId,
        extra: { connectorType: type },
      });
      return null;
    } finally {
      inFlightRefreshes.delete(key);
    }
  })();

  // `run` never rejects — every path inside it returns a value — so resolving
  // the handle from it cannot produce an unhandled rejection for the waiters.
  run.then(settle, () => settle(null));
  return handle;
}
