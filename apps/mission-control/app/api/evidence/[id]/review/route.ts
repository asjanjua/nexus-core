/**
 * POST /api/evidence/[id]/review
 *
 * Human approval decision for a pending_approval evidence record.
 *
 * Body:
 *   { decision: "approved" | "rejected", actor?: string }
 *
 * Transitions:
 *   approved  → ingestionStatus set to "processed"  (enters LLM synthesis queue)
 *   rejected  → ingestionStatus set to "quarantined" (blocked, removed from pipeline)
 *
 * Only records in "pending_approval" state can be reviewed via this endpoint.
 * Attempting to review an already-processed or quarantined record returns 409.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  actor: z.string().min(1).max(120).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // Fetch the record first to validate it belongs to this workspace and is reviewable
  const rows = await repository.getEvidenceForWorkspace(ctx.workspaceId);
  const record = rows.find((r) => r.id === id);

  if (!record) return fail("evidence_not_found", 404);
  if (record.ingestionStatus !== "pending_approval") {
    return fail(`evidence_not_reviewable:current_status_is_${record.ingestionStatus}`, 409);
  }

  const newStatus = parsed.data.decision === "approved" ? "processed" : "quarantined";
  const actor = parsed.data.actor ?? ctx.userId;

  const updated = await repository.updateEvidenceStatus(id, newStatus, actor);
  if (!updated) return fail("evidence_update_failed", 500);

  return ok({
    id: updated.id,
    ingestionStatus: updated.ingestionStatus,
    decision: parsed.data.decision,
    actor
  });
}
