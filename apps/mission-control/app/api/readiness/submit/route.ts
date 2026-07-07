/**
 * POST /api/readiness/submit
 *
 * Public lead-capture endpoint for the AI-Native Readiness Assessment.
 * Writes a lightweight audit/lead event and a pending readiness_submissions
 * record with a single-use claim code (migration 0033). The claim code lets
 * signup inherit the readiness context via POST /api/readiness/claim.
 *
 * Lane assignment happens server-side (lib/services/lane-assignment.ts) so the
 * public client never decides its own buyer lane.
 *
 * This is intentionally not treated as a certification, regulatory opinion,
 * legal opinion, financial opinion, or automated eligibility decision.
 */

import { createHash, randomBytes } from "crypto";
import { ok, fail } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { buildReadinessClaimEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";
import { assignLane } from "@/lib/services/lane-assignment";
import { z } from "zod";

const scoreSchema = z.record(z.number().int().min(1).max(7));

const readinessSubmitSchema = z.object({
  scores: scoreSchema,
  total: z.number().int().min(7).max(49),
  band: z.string().min(1).max(80),
  email: z.string().email().max(320).nullable().optional(),
  sector: z.string().max(64).nullable().optional(),
  companySize: z.string().max(32).nullable().optional(),
  role: z.string().max(64).nullable().optional(),
});

const CLAIM_TTL_HOURS = 72;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = readinessSubmitSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_input", 400);

  const submittedAt = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const lane = assignLane({
    sector: parsed.data.sector,
    companySize: parsed.data.companySize,
    role: parsed.data.role,
    band: parsed.data.band,
  });

  // Single-use claim code. Only the SHA-256 hash is stored server-side.
  const claimCode = randomBytes(24).toString("base64url");
  const claimCodeHash = createHash("sha256").update(claimCode).digest("hex");
  const submissionId = `rs_${randomBytes(12).toString("hex")}`;
  const expiresAt = new Date(Date.now() + CLAIM_TTL_HOURS * 60 * 60 * 1000);

  let claimIssued = true;
  try {
    await repository.createReadinessSubmission({
      id: submissionId,
      claimCodeHash,
      scores: parsed.data.scores,
      total: parsed.data.total,
      band: parsed.data.band,
      sector: parsed.data.sector ?? null,
      companySize: parsed.data.companySize ?? null,
      role: parsed.data.role ?? null,
      assignedLane: lane.lane,
      laneConfidence: lane.confidence,
      email: parsed.data.email ?? null,
      expiresAt,
    });
  } catch {
    // No DB (demo mode) or write failure — result still renders, claim just
    // cannot be redeemed later. Never block the public result on persistence.
    claimIssued = false;
  }

  await repository.pushAudit({
    workspaceId: "public-readiness",
    type: "readiness.assessment_submitted",
    actor: parsed.data.email ?? "anonymous",
    payload: {
      scores: parsed.data.scores,
      total: parsed.data.total,
      band: parsed.data.band,
      email: parsed.data.email ?? null,
      sector: parsed.data.sector ?? null,
      companySize: parsed.data.companySize ?? null,
      role: parsed.data.role ?? null,
      assignedLane: lane.lane,
      laneConfidence: lane.confidence,
      laneReason: lane.reason,
      submissionId,
      submittedAt,
      disclaimer:
        "Directional readiness guidance only; not a regulatory, financial, legal, or operational opinion.",
      source: "public_readiness_page",
      userAgent,
      forwardedFor,
    },
  });

  if (claimIssued && parsed.data.email) {
    if (!resendConfigured()) {
      await repository.pushAudit({
        workspaceId: "public-readiness",
        type: "readiness.claim_email_skipped",
        actor: parsed.data.email,
        payload: {
          reason: "resend_not_configured",
          submissionId,
          email: parsed.data.email,
        },
      });
    } else {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
      const claimUrl = `${appUrl || request.url.replace(/\/api\/readiness\/submit.*$/, "")}/sign-up?readiness=${encodeURIComponent(claimCode)}`;
      try {
        await sendEmail({
          to: parsed.data.email,
          subject: `Your NexusAI readiness result: ${parsed.data.band}`,
          html: buildReadinessClaimEmailHtml({
            email: parsed.data.email,
            claimUrl,
            lane: lane.lane,
            laneConfidence: lane.confidence,
            band: parsed.data.band,
            expiresAt: expiresAt.toISOString(),
          }),
        });
        await repository.pushAudit({
          workspaceId: "public-readiness",
          type: "readiness.claim_email_sent",
          actor: parsed.data.email,
          payload: {
            submissionId,
            email: parsed.data.email,
            expiresAt: expiresAt.toISOString(),
          },
        });
      } catch (error) {
        await repository.pushAudit({
          workspaceId: "public-readiness",
          type: "readiness.claim_email_failed",
          actor: parsed.data.email,
          payload: {
            submissionId,
            email: parsed.data.email,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  return ok({
    submitted: true,
    submittedAt,
    lane: lane.lane,
    laneConfidence: lane.confidence,
    claimCode: claimIssued ? claimCode : null,
    expiresAt: claimIssued ? expiresAt.toISOString() : null,
  });
}
