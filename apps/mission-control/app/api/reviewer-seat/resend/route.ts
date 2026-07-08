/**
 * POST /api/reviewer-seat/resend  { seatId }
 *
 * Re-send an invited reviewer seat. The original invite code was only stored as
 * a hash and cannot be recovered, so resending ROTATES the code: a fresh
 * single-use code is generated, the seat's hash + expiry are updated, and a new
 * invite email is sent. Any previously-shared link stops working. Only seats
 * still in the `invited` state can be resent.
 */

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildReviewerInviteEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const bodySchema = z.object({ seatId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  const inviteCode = randomBytes(24).toString("base64url");
  const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const seat = await repository.refreshReviewerInvite(auth.workspaceId, parsed.data.seatId, inviteCodeHash, expiresAt);
  if (!seat) return fail("reviewer_seat_not_found_or_not_pending", 404);

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const origin = configured || new URL(request.url).origin;
  const acceptUrl = `${origin}/reviewer-seat/accept?code=${encodeURIComponent(inviteCode)}`;

  let emailSent = false;
  if (resendConfigured()) {
    const workspace = await repository.getWorkspaceSettings(auth.workspaceId).catch(() => null);
    try {
      await sendEmail({
        to: seat.email,
        subject: `Your reviewer invite for ${workspace?.name ?? "your workspace"} on NexusAI`,
        html: buildReviewerInviteEmailHtml({
          reviewerName: seat.name,
          workspaceName: workspace?.name ?? auth.workspaceId,
          invitedBy: auth.userId,
          acceptUrl,
          expiresAt: seat.expiresAt,
        }),
      });
      emailSent = true;
    } catch {
      // fall through — code + link are returned once for manual sharing
    }
  }

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "reviewer_seat.invite_resent",
    actor: auth.userId,
    payload: { seatId: seat.id, email: seat.email, emailSent },
  }).catch(() => {});

  return ok({ seat, inviteCode, acceptUrl, emailSent });
}
