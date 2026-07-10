/**
 * POST /api/workspace/expiry
 *
 * Sets or clears a time-boxed expiry deadline on the caller's workspace
 * (Vantage per-deal, Meridian per-submission workspaces). Setting a deadline
 * does not itself block anything — the workspace-expiry cron applies the
 * block once the deadline passes (see repository.convertExpiredWorkspaces).
 *
 * Body: { expiresAt: string | null } — ISO 8601 timestamp, or null to clear.
 * Scope: admin
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const bodySchema = z.object({
  expiresAt: z.string().datetime().nullable(),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  await repository.setWorkspaceExpiry(ctx.workspaceId, parsed.data.expiresAt);
  return ok({ workspaceId: ctx.workspaceId, expiresAt: parsed.data.expiresAt });
}
