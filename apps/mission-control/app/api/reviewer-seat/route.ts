/**
 * Reviewer seat (migration 0035) — identity-bound reviewer role.
 *
 * GET  /api/reviewer-seat          — list seats for the caller's workspace
 * POST /api/reviewer-seat          — create an invite (returns the invite code ONCE)
 * DELETE /api/reviewer-seat?id=... — revoke a seat
 *
 * The invite code is generated server-side, returned once in the POST
 * response, and stored only as a sha256 hash. Acceptance
 * (POST /api/reviewer-seat/accept) binds the seat to the accepting Clerk
 * user id — that binding is what makes approvals identity-bound.
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildReviewerInviteEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(160).optional(),
});

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const [seats, accepted] = await Promise.all([
    repository.listReviewerSeats(auth.workspaceId),
    repository.getAcceptedReviewerSeat(auth.workspaceId),
  ]);
  return ok({ seats, acceptedSeat: accepted });
}

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // One live accepted seat per workspace in V1: block new invites while an
  // accepted seat exists (revoke first — an explicit, audited step).
  const accepted = await repository.getAcceptedReviewerSeat(auth.workspaceId);
  if (accepted) return fail("reviewer_seat_already_accepted", 409);

  const inviteCode = randomBytes(24).toString("base64url");
  const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");

  const seat = await repository.createReviewerSeat({
    id: `rs_${randomUUID()}`,
    workspaceId: auth.workspaceId,
    email: parsed.data.email,
    name: parsed.data.name ?? null,
    inviteCodeHash,
    invitedBy: auth.userId,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "reviewer_seat.invited",
    actor: auth.userId,
    payload: { seatId: seat.id, email: seat.email },
  }).catch(() => {});

  // Deliver the invite by email when Resend is configured. The plain code is
  // never persisted, so the email is the only durable delivery path; the code
  // is also returned once so an admin can copy the accept link manually if
  // email is not configured (self-hosted / pre-production).
  const acceptUrl = buildAcceptUrl(request, inviteCode);
  let emailSent = false;
  if (resendConfigured()) {
    const workspace = await repository.getWorkspaceSettings(auth.workspaceId).catch(() => null);
    const workspaceName = workspace?.name ?? auth.workspaceId;
    try {
      await sendEmail({
        to: seat.email,
        subject: `You are invited to review for ${workspaceName} on NexusAI`,
        html: buildReviewerInviteEmailHtml({
          reviewerName: seat.name,
          workspaceName,
          invitedBy: auth.userId,
          acceptUrl,
          expiresAt: seat.expiresAt,
        }),
      });
      emailSent = true;
      void repository.pushAudit({
        workspaceId: auth.workspaceId,
        type: "reviewer_seat.invite_email_sent",
        actor: auth.userId,
        payload: { seatId: seat.id, email: seat.email },
      }).catch(() => {});
    } catch (err) {
      void repository.pushAudit({
        workspaceId: auth.workspaceId,
        type: "reviewer_seat.invite_email_failed",
        actor: auth.userId,
        payload: { seatId: seat.id, email: seat.email, reason: String(err instanceof Error ? err.message : err) },
      }).catch(() => {});
    }
  } else {
    void repository.pushAudit({
      workspaceId: auth.workspaceId,
      type: "reviewer_seat.invite_email_skipped",
      actor: auth.userId,
      payload: { seatId: seat.id, email: seat.email, reason: "resend_not_configured" },
    }).catch(() => {});
  }

  // The plain invite code + accept link are returned exactly once so the
  // inviter can share them manually when email delivery is unavailable.
  return ok({ seat, inviteCode, acceptUrl, emailSent });
}

/** Absolute accept-page URL carrying the single-use invite code. */
function buildAcceptUrl(request: Request, inviteCode: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const origin = configured || new URL(request.url).origin;
  return `${origin}/reviewer-seat/accept?code=${encodeURIComponent(inviteCode)}`;
}

export async function DELETE(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const seatId = new URL(request.url).searchParams.get("id");
  if (!seatId) return fail("invalid_request", 400);

  const revoked = await repository.revokeReviewerSeat(auth.workspaceId, seatId);
  if (!revoked) return fail("reviewer_seat_not_found", 404);

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "reviewer_seat.revoked",
    actor: auth.userId,
    payload: { seatId: revoked.id, email: revoked.email },
  }).catch(() => {});

  return ok(revoked);
}
