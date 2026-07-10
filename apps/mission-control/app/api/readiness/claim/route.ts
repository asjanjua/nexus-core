/**
 * POST /api/readiness/claim
 *
 * Redeems a single-use readiness claim code after authentication, writing the
 * readiness context (scores, band, sector, size, role, assigned buyer lane)
 * into the caller's strategy profile. This is the anonymous-to-authenticated
 * bridge in the canonical strategy: readiness -> lane -> onboarding.
 *
 * Rules (docs/LANE_ASSIGNMENT_SPEC.md):
 * - Requires an authenticated session. The claim always writes to the
 *   caller's own workspace; no workspaceId override is accepted.
 * - Codes are single-use and expire 72h after submission (atomic consume).
 * - initialLane is write-once; the claim sets it alongside buyerLane.
 * - regulated_enterprise sets governancePosture to "regulated".
 */

import { createHash } from "crypto";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

const claimSchema = z.object({
  claimCode: z.string().min(16).max(128),
});

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const claimCodeHash = createHash("sha256").update(parsed.data.claimCode).digest("hex");
  const submission = await repository.claimReadinessSubmission(claimCodeHash, auth.workspaceId);
  if (!submission) return fail("claim_invalid_or_expired", 404);

  const lane = submission.assignedLane;
  const profile = await repository.upsertStrategyProfile(auth.workspaceId, {
    buyerLane: lane,
    initialLane: lane,
    laneConfidence: submission.laneConfidence,
    role: submission.role ?? undefined,
    sector: submission.sector ?? undefined,
    companySize: submission.companySize ?? undefined,
    readinessScores: submission.scores,
    readinessBand: submission.band,
    governancePosture: lane === "regulated_enterprise" ? "regulated" : undefined,
    externalRef: submission.id,
  });

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "readiness.claim_redeemed",
    actor: auth.userId,
    payload: {
      submissionId: submission.id,
      assignedLane: lane,
      laneConfidence: submission.laneConfidence,
      band: submission.band,
    },
  }).catch(() => {});

  return ok({ claimed: true, profile });
}
