import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";
import {
  resolveApprovalDecision,
  type ResolverSeat,
} from "@/lib/approval-policy-resolver";

const bodySchema = z.object({
  status: z.enum(["approved", "rejected"]),
  actor: z.string().default("operator"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recommendationId: string }> },
) {
  const { ctx, error } = await requireScope(request, "write:approvals");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);
  const { recommendationId } = await params;

  // Server-resolved identity, never a client-supplied label.
  const actor = ctx.userId || parsed.data.actor;

  // Load approval policy + accepted seats for this workspace.
  const policy = await repository.getActiveApprovalPolicy(ctx.workspaceId).catch(() => null);
  const seats = await repository.getAcceptedReviewerSeats(ctx.workspaceId).catch(() => []);

  // Resolve the approval decision against the configured policy.
  const isBreakGlass = ctx.authType !== "session";
  const decision = resolveApprovalDecision({
    policy,
    seats: seats.map((s): ResolverSeat => ({
      id: s.id,
      clerkUserId: s.clerkUserId ?? "",
      role: s.role ?? null,
      level: s.level ?? null,
      team: s.team ?? null,
    })),
    callerUserId: ctx.userId ?? null,
    isBreakGlass,
    priorDecisions: [], // TODO: populate from audit trail for multi-approver modes
  });

  if (!decision.allowed) {
    void repository.pushAudit({
      workspaceId: ctx.workspaceId,
      type: "approval.denied",
      actor,
      payload: {
        recommendationId,
        status: parsed.data.status,
        reason: decision.reason,
        detail: decision.detail,
        policyMode: policy?.mode ?? "single",
      },
    }).catch(() => {});
    return fail(decision.detail, 403);
  }

  // Update the recommendation status.
  const updated = await repository.updateRecommendationStatusForWorkspace(
    ctx.workspaceId,
    recommendationId,
    parsed.data.status,
    actor,
  );

  if (!updated) return fail("recommendation_not_found", 404);

  // Audit the approval with policy context.
  void repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "approval.decision",
    actor,
    payload: {
      recommendationId,
      status: parsed.data.status,
      seatId: decision.matchedSeat.seatId,
      approvedByBoundReviewer: !isBreakGlass,
      breakGlass: isBreakGlass,
      policyMode: policy?.mode ?? "single",
      terminal: decision.terminal,
      remaining: decision.remaining,
    },
  }).catch(() => {});

  return ok(updated);
}
