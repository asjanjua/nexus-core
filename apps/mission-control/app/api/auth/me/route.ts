/**
 * GET /api/auth/me
 *
 * Returns the current caller's identity derived from their session cookie
 * or Bearer token. Used by client components that need workspaceId without
 * hardcoding it.
 */

import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  return ok({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    authType: ctx.authType,
  });
}
