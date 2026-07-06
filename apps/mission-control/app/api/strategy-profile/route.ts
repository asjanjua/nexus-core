/**
 * GET  /api/strategy-profile — retrieve current strategy profile
 * PATCH /api/strategy-profile — upsert strategy profile fields
 *
 * Connected to public /readiness assessment and post-signup onboarding routing.
 */
import { fail, ok } from "@/lib/api";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";
import { strategyProfileInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

function hasLaneChangeReason(reason: string | null | undefined) {
  return typeof reason === "string" && reason.trim().length >= 8;
}

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  // Authz: always the caller's own workspace. A caller-supplied workspaceId
  // must never widen access to another workspace's strategy profile.
  const workspaceId = auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const profile = await repository.getStrategyProfile(workspaceId);
  return ok(profile ?? null);
}

export async function PATCH(request: Request) {
  const auth = await resolveAuth(request);
  const body = await request.json().catch(() => null);
  const parsed = strategyProfileInputSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // Authz: same rule as GET — ignore any workspaceId supplied in the body.
  const workspaceId = auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const existing = await repository.getStrategyProfile(workspaceId);
  const requestedLane = parsed.data.buyerLane;
  const currentLane = existing?.buyerLane;
  const isLaneChange = Boolean(currentLane && requestedLane && requestedLane !== currentLane);

  if (isLaneChange && !hasLaneChangeReason(parsed.data.laneChangeReason)) {
    return fail("lane_change_reason_required", 400);
  }

  if (
    isLaneChange &&
    currentLane === "regulated_enterprise" &&
    requestedLane !== "regulated_enterprise" &&
    parsed.data.regulatedExitConfirmed !== true
  ) {
    return fail("regulated_exit_confirmation_required", 400);
  }

  const input = {
    ...parsed.data,
    laneChangeReason: isLaneChange ? parsed.data.laneChangeReason?.trim() : parsed.data.laneChangeReason,
    laneChangedBy: isLaneChange ? (parsed.data.laneChangedBy ?? "user_confirmation") : parsed.data.laneChangedBy,
    laneChangedAt: isLaneChange ? (parsed.data.laneChangedAt ?? new Date().toISOString()) : parsed.data.laneChangedAt,
  };
  const profile = await repository.upsertStrategyProfile(workspaceId, input);
  return ok(profile);
}
