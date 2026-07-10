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
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const acceptSchema = z.object({
  inviteCode: z.string().min(16).max(128),
});

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const inviteCodeHash = createHash("sha256").update(parsed.data.inviteCode).digest("hex");
  const seat = await repository.acceptReviewerSeat(inviteCodeHash, auth.userId);
  if (!seat) return fail("invite_invalid_or_expired", 404);

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
