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

  // Restrict approval rights (reviewer-seat slice 3): once a workspace has an
  // accepted, identity-bound reviewer seat, only that reviewer — acting as a
  // signed-in human — may approve or reject. Bearer/agent tokens remain a
  // break-glass path (audited as not-bound) so automation and admin recovery
  // are not locked out. Multi-level / delegated approval chains are a separate
  // backlog item (P2) and deliberately out of scope here.
  const reviewerSeat = await repository
    .getAcceptedReviewerSeat(ctx.workspaceId)
    .catch(() => null);
  if (
    reviewerSeat &&
    ctx.authType === "session" &&
    ctx.userId !== reviewerSeat.clerkUserId
  ) {
    void repository.pushAudit({
      workspaceId: ctx.workspaceId,
      type: "approval.denied_not_bound_reviewer",
      actor,
      payload: {
        recommendationId,
        status: parsed.data.status,
        reviewerSeatId: reviewerSeat.id,
      },
    }).catch(() => {});
    return fail("approval_requires_bound_reviewer", 403);
  }

  const updated = await repository.updateRecommendationStatusForWorkspace(
    ctx.workspaceId,
    recommendationId,
    parsed.data.status,
    actor
  );

  if (!updated) return fail("recommendation_not_found", 404);

  // Record whether the approver IS the bound reviewer — part of the pilot
  // evidence trail (the seat was already resolved above).
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
