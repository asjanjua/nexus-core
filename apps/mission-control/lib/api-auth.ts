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
 * Session (Clerk) users have wildcard scope and always pass scope checks.
 * Bearer (agent) tokens must carry the specific scope being requested.
 * "admin" scope in a Bearer token is treated as wildcard.
 *
 * Both functions are async because Clerk's auth() is async.
 */

import { auth } from "@clerk/nextjs/server";
import { decodeBearerToken } from "@/lib/tokens";
import { fail } from "@/lib/api";

export type AuthContext = {
  workspaceId: string;
  userId: string;
  scopes: string[];
  authType: "session" | "bearer";
};

export const DEFAULT_WORKSPACE =
  process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

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
  const { userId, orgId } = await auth();
  if (userId) {
    return {
      workspaceId: orgId ?? DEFAULT_WORKSPACE,
      userId,
      scopes: ["*"],
      authType: "session",
    };
  }

  // --- Bearer token (agent / API key caller) ---
  const payload = decodeBearerToken(request.headers.get("authorization"));
  if (payload) {
    return {
      workspaceId: payload.workspaceId,
      userId: payload.keyId,
      scopes: payload.scopes,
      authType: "bearer",
    };
  }

  return null;
}

/**
 * Resolve auth and enforce a required scope for Bearer tokens.
 *
 * Usage in route handlers:
 *   const { ctx, error } = await requireScope(request, "read:dashboard");
 *   if (error) return error;
 *   // ctx.workspaceId is safe to use
 */
export async function requireScope(
  request: Request,
  scope: string
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
  return { ctx, error: null };
}
