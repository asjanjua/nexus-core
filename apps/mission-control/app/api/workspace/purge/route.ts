/**
 * POST /api/workspace/purge
 *
 * Deliberate, explicit deletion of a workspace's evidence, entities, and
 * agent outputs. NEVER triggered automatically — this is the "deletable on
 * demand" requirement for time-boxed deal/submission workspaces (Vantage,
 * Meridian). The workspace row and its audit trail are preserved.
 *
 * allowWhenBlocked: true because purging an expired/suspended workspace is
 * exactly the expected use case — the block must not prevent cleanup.
 *
 * Body: { confirm: true } — a deliberate confirmation flag, not just an
 * empty POST, so this can't be triggered by an accidental request replay.
 * Scope: admin
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const bodySchema = z.object({
  confirm: z.literal(true),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin", { allowWhenBlocked: true });
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("confirmation_required", 400);

  const result = await repository.purgeWorkspaceData(ctx.workspaceId);
  return ok({ workspaceId: ctx.workspaceId, ...result });
}
