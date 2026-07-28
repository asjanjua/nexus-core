/**
 * POST /api/reviewer-seat/accept
 *
 * Redeems a single-use reviewer invite code, binding the seat to the
 * authenticated Clerk user. On success the seat's workspace strategy profile
 * is updated with the reviewer's name/email so the scorer's reviewer gate
 * reflects an identity-bound reviewer rather than a free-text field.
 */

import { createHash } from "crypto";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { rateLimit } from "@/lib/rate-limit";

const acceptSchema = z.object({
  inviteCode: z.string().min(16).max(128),
});

/** Invite codes are secrets; keyed on the caller so rotating IPs does not help. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  // A reviewer is a genuine second set of eyes. An org admin can invite and
  // manage the seat, but cannot redeem it and then approve their own work.
  if (auth.isOrgAdmin) return fail("reviewer_requires_non_admin_member", 403);

  const limit = rateLimit(`reviewer-accept:${auth.userId}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) return fail("rate_limited", 429, { retryAfter: limit.retryAfter });

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const clerkUser = await currentUser().catch(() => null);
  if (!clerkUser || clerkUser.id !== auth.userId) {
    return fail("reviewer_identity_verification_failed", 403);
  }

  const verifiedEmails = clerkUser.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress.trim().toLowerCase());
  if (verifiedEmails.length === 0) return fail("reviewer_email_unverified", 403);

  const inviteCodeHash = createHash("sha256").update(parsed.data.inviteCode).digest("hex");
  const seat = await repository.acceptReviewerSeat(
    inviteCodeHash,
    auth.userId,
    verifiedEmails,
    auth.workspaceId
  );
  if (!seat) return fail("invite_invalid_expired_or_email_mismatch", 404);

  // Reflect the identity-bound reviewer on the seat's workspace profile.
  await repository
    .upsertStrategyProfile(seat.workspaceId, {
      reviewerName: seat.name ?? seat.email,
      reviewerEmail: seat.email,
    })
    .catch(() => {});

  void repository.pushAudit({
    workspaceId: seat.workspaceId,
    type: "reviewer_seat.accepted",
    actor: auth.userId,
    payload: { seatId: seat.id, email: seat.email, clerkUserId: auth.userId },
  }).catch(() => {});

  return ok(seat);
}
