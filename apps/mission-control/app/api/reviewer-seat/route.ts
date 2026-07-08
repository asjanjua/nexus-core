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

  // The plain invite code is returned exactly once. Delivery (email) is the
  // caller's responsibility in this slice.
  return ok({ seat, inviteCode });
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
