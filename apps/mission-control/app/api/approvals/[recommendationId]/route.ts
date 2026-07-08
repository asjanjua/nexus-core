import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";

const bodySchema = z.object({
  status: z.enum(["approved", "rejected"]),
  actor: z.string().default("operator")
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recommendationId: string }> }
) {
  const { ctx, error } = await requireScope(request, "write:approvals");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);
  const { recommendationId } = await params;

  // Identity-bound approvals (reviewer-seat slice): the recorded actor is the
  // server-resolved identity, never a client-supplied label. The free-text
  // `actor` field remains only as a fallback for legacy bearer callers whose
  // token carries no user identity.
  const actor = ctx.userId || parsed.data.actor;

  const updated = await repository.updateRecommendationStatusForWorkspace(
    ctx.workspaceId,
    recommendationId,
    parsed.data.status,
    actor
  );

  if (!updated) return fail("recommendation_not_found", 404);

  // If an accepted reviewer seat exists, record whether the approver IS the
  // bound reviewer — part of the pilot evidence trail.
  const reviewerSeat = await repository
    .getAcceptedReviewerSeat(ctx.workspaceId)
    .catch(() => null);
  void repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "approval.decision",
    actor,
    payload: {
      recommendationId,
      status: parsed.data.status,
      reviewerSeatId: reviewerSeat?.id ?? null,
      approvedByBoundReviewer: Boolean(
        reviewerSeat && reviewerSeat.clerkUserId === ctx.userId
      ),
    },
  }).catch(() => {});

  return ok(updated);
}
