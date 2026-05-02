/**
 * GET /api/auth/me
 *
 * Returns the current caller's identity derived from their session cookie
 * or Bearer token. Used by client components that need workspaceId without
 * hardcoding it. Always returns 200 — unauthenticated callers get the
 * default demo workspace so the settings page still renders in dev.
 */

import { ok } from "@/lib/api";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  return ok({
    workspaceId: auth?.workspaceId ?? DEFAULT_WORKSPACE,
    userId: auth?.userId ?? "anonymous",
    authType: auth?.authType ?? null,
  });
}
