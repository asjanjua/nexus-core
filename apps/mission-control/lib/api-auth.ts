/**
 * API authentication helpers for NexusAI route handlers.
 *
 * Identity resolution strategy (in priority order):
 *   1. Clerk session  — browser/human callers; orgId becomes workspaceId
 *   2. Bearer token   — agent/API key callers; token encodes workspaceId + scopes
 *
 * resolveAuth()   — returns caller identity or null
 * requireScope()  — enforces a required scope; returns context or an error Response
 *
 * Session (Clerk) users hold wildcard scope for ordinary work, but
 * ADMIN_ONLY_SCOPES additionally require Clerk org-admin — see isOrgAdmin.
 * Bearer (agent) tokens must carry the specific scope being requested.
 * "admin" scope in a Bearer token is treated as wildcard.
 *
 * Both functions are async because Clerk's auth() is async.
 */

import { auth } from "@clerk/nextjs/server";
import { decodeBearerToken } from "@/lib/tokens";
import { fail } from "@/lib/api";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { repository, evaluateWorkspaceAccess } from "@/lib/data/repository";
import { captureHandledError } from "@/lib/observability/sentry";

export type AuthContext = {
  workspaceId: string;
  userId: string;
  scopes: string[];
  authType: "session" | "bearer";
  /**
   * Whether the caller may exercise ADMIN_ONLY_SCOPES. True for Clerk
   * org-admins and for personal (org-less) workspaces, where the user is the
   * workspace's only member. False for ordinary org members.
   */
  isOrgAdmin: boolean;
};

/**
 * Clerk's built-in admin role. Clerk guarantees this system role exists on
 * every org and cannot be deleted, so custom roles never displace it.
 */
const CLERK_ADMIN_ROLE = "org:admin";

/**
 * Scopes that a plain org member must not hold. These gate destructive or
 * tenant-wide operations — workspace purge, agent-key issue/revoke, connector
 * install, prompt and eval management, audit log access.
 */
const ADMIN_ONLY_SCOPES = new Set(["admin", "read:admin", "write:rooms"]);

export const DEFAULT_WORKSPACE =
  process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

/**
 * Revocation state for issued bearer tokens, cached briefly.
 *
 * Mirrors the workspace access cache below: a DB round-trip on every agent
 * request would be wasteful, and a revocation taking up to 30s to propagate is
 * a large improvement on the previous behaviour of up to the token's full 1h
 * TTL. Unlike that cache this one does NOT fail open — a key the operator
 * explicitly revoked (typically because it leaked) must stop working, so an
 * unknown key resolves to unusable.
 */
const agentKeyCache = new Map<string, { usable: boolean; expiresAt: number }>();
const AGENT_KEY_CACHE_TTL_MS = 30 * 1000;

async function agentKeyUsable(keyId: string): Promise<boolean> {
  const cached = agentKeyCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) return cached.usable;
  const usable = await repository.isAgentKeyUsable(keyId);
  agentKeyCache.set(keyId, { usable, expiresAt: Date.now() + AGENT_KEY_CACHE_TTL_MS });
  return usable;
}

/** Drop a key's cached revocation state so a revoke takes effect immediately. */
export function invalidateAgentKeyCache(keyId: string): void {
  agentKeyCache.delete(keyId);
}

/**
 * Attempt to resolve caller identity from the incoming request.
 *
 * For Clerk sessions: workspaceId = Clerk orgId.
 * If the user is authenticated but has no active org (new signup, not yet
 * onboarded), workspaceId falls back to DEFAULT_WORKSPACE. The onboarding
 * flow is responsible for creating the org and redirecting back.
 */
export async function resolveAuth(request: Request): Promise<AuthContext | null> {
  // --- Clerk session (browser / human user) ---
  const { userId, orgId, orgRole } = await auth();
  if (userId) {
    // If the user has an active Clerk org, use orgId as the workspace (multi-user tenant).
    // Otherwise fall back to their personal userId so each user gets an isolated workspace
    // instead of everyone sharing the DEFAULT_WORKSPACE demo bucket.
    return {
      workspaceId: orgId ?? userId,
      userId,
      scopes: ["*"],
      authType: "session",
      // No org means a personal workspace whose only member is this user, so
      // they are its admin. Inside an org, only Clerk org-admins qualify.
      isOrgAdmin: !orgId || orgRole === CLERK_ADMIN_ROLE,
    };
  }

  // --- Bearer token (agent / API key caller) ---
  const payload = decodeBearerToken(request.headers.get("authorization"));
  if (payload) {
    // Tokens are self-contained HMAC blobs with a 1h TTL, so signature and exp
    // alone would keep a revoked key working until its tokens aged out.
    if (!(await agentKeyUsable(payload.keyId))) return null;
    return {
      workspaceId: payload.workspaceId,
      userId: payload.keyId,
      scopes: payload.scopes,
      authType: "bearer",
      // Bearer privilege is carried by the token's own scopes, which
      // requireScope checks directly; this mirrors that for callers reading ctx.
      isOrgAdmin: payload.scopes.includes("*") || payload.scopes.includes("admin"),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Workspace access gate (suspended / expired / cancelled workspaces)
//
// Short in-process TTL cache so requireScope — called on nearly every API
// route — doesn't add a DB round-trip to every single request. Access state
// changes (suspend, expiry, payment recovery) are not so time-sensitive that
// a 30s staleness window matters; this mirrors the caching pattern already
// used for token budget checks in lib/billing/budget.ts.
// ---------------------------------------------------------------------------

const accessCache = new Map<string, { blocked: boolean; reason: string | null; expiresAt: number }>();
const ACCESS_CACHE_TTL_MS = 30 * 1000;

async function checkWorkspaceAccess(workspaceId: string): Promise<{ blocked: boolean; reason: string | null }> {
  const cached = accessCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) {
    return { blocked: cached.blocked, reason: cached.reason };
  }
  // Fail open on a lookup error — never lock everyone out because of a DB blip
  // — but report it, because a sustained failure means suspended and expired
  // workspaces are being served as if they were active.
  const record = await repository.getWorkspaceStatus(workspaceId).catch((error: unknown) => {
    captureHandledError(error, {
      route: "lib/api-auth.checkWorkspaceAccess",
      errorType: "workspace_access_check_failed_open",
      workspaceId,
    });
    return null;
  });
  const result = record ? evaluateWorkspaceAccess(record) : { blocked: false, reason: null };
  accessCache.set(workspaceId, { ...result, expiresAt: Date.now() + ACCESS_CACHE_TTL_MS });
  return result;
}

/**
 * Resolve auth and enforce a required scope for Bearer tokens.
 *
 * Usage in route handlers:
 *   const { ctx, error } = await requireScope(request, "read:dashboard");
 *   if (error) return error;
 *   // ctx.workspaceId is safe to use
 *
 * Pass { allowWhenBlocked: true } for routes a suspended/expired workspace
 * must still be able to reach — e.g. billing checkout/portal, so a customer
 * can actually resolve the thing that's blocking them.
 */
export async function requireScope(
  request: Request,
  scope: string,
  options: { allowWhenBlocked?: boolean } = {}
): Promise<{ ctx: AuthContext; error: null } | { ctx: null; error: Response }> {
  const ctx = await resolveAuth(request);
  if (!ctx) {
    return { ctx: null, error: fail("unauthorized", 401) };
  }
  if (
    ctx.authType === "bearer" &&
    !ctx.scopes.includes("*") &&
    !ctx.scopes.includes("admin") &&
    !ctx.scopes.includes(scope)
  ) {
    return { ctx: null, error: fail("insufficient_scope", 403) };
  }
  // A Clerk session carries wildcard scope, so admin-only scopes are gated on
  // the caller's org role instead. Without this an ordinary org member could
  // purge the workspace or revoke agent keys.
  if (ADMIN_ONLY_SCOPES.has(scope) && !ctx.isOrgAdmin) {
    return { ctx: null, error: fail("admin_role_required", 403) };
  }
  if (!options.allowWhenBlocked) {
    const access = await checkWorkspaceAccess(ctx.workspaceId);
    if (access.blocked) {
      return { ctx: null, error: fail(`workspace_${access.reason}`, 402) };
    }
  }
  return { ctx, error: null };
}

/**
 * Gate for Pinavia staff-only API routes — the ones whose response describes
 * the PLATFORM rather than the caller's own workspace.
 *
 * Use this, not `requireScope("admin")`, whenever the handler returns data
 * aggregated across workspaces or describes deployment infrastructure.
 * `requireScope` resolves admin-ness through `AuthContext.isOrgAdmin`, which is
 * true for every Clerk org-admin AND for every org-less personal workspace — so
 * any self-signed-up user passes it. That is the correct gate for tenant-wide
 * actions inside a customer's own workspace and the wrong gate for platform
 * surfaces.
 *
 * The `/admin` page already gates on `isPlatformAdmin`. Routes it fetches from
 * must gate the same way or the page check is decorative: the browser can call
 * the API directly.
 *
 * Fails closed — with PINAVIA_ADMIN_PRINCIPALS unset nobody passes.
 *
 * Returns 403 rather than 404 for a signed-in non-staff user: the route's
 * existence is not a secret, and a misleading 404 would send a Pinavia operator
 * hunting a deploy problem when the real cause is an unset env var.
 */
export async function requirePlatformAdmin(
  request: Request
): Promise<{ ctx: AuthContext; error: null } | { ctx: null; error: Response }> {
  const ctx = await resolveAuth(request);
  if (!ctx) return { ctx: null, error: fail("unauthorized", 401) };
  if (!isPlatformAdmin(ctx)) {
    return { ctx: null, error: fail("platform_admin_required", 403) };
  }
  return { ctx, error: null };
}
