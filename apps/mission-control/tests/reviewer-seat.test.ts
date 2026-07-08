import { createHash, randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";

function makeInvite() {
  const inviteCode = randomBytes(24).toString("base64url");
  const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");
  return { inviteCode, inviteCodeHash };
}

async function createSeat(workspaceId: string, overrides: { expiresAt?: Date } = {}) {
  const { inviteCodeHash } = makeInvite();
  const seat = await repository.createReviewerSeat({
    id: `rs_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId,
    email: "reviewer@example.com",
    name: "Rabia Reviewer",
    inviteCodeHash,
    invitedBy: "user_sponsor",
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
  });
  return { seat, inviteCodeHash };
}

describe("reviewer seat lifecycle (migration 0035)", () => {
  it("creates an invited seat without exposing the invite hash", async () => {
    const ws = `ws-reviewer-${Date.now()}-a`;
    const { seat } = await createSeat(ws);
    expect(seat.status).toBe("invited");
    expect(seat.clerkUserId).toBeNull();
    expect("inviteCodeHash" in seat).toBe(false);
    const listed = await repository.listReviewerSeats(ws);
    expect(listed.map((s) => s.id)).toContain(seat.id);
    expect(listed.every((s) => !("inviteCodeHash" in s))).toBe(true);
  });

  it("accept binds the seat to the accepting Clerk user", async () => {
    const ws = `ws-reviewer-${Date.now()}-b`;
    const { inviteCodeHash } = await createSeat(ws);
    const accepted = await repository.acceptReviewerSeat(inviteCodeHash, "user_reviewer_1");
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.clerkUserId).toBe("user_reviewer_1");
    expect(accepted?.acceptedAt).toBeTruthy();

    const active = await repository.getAcceptedReviewerSeat(ws);
    expect(active?.id).toBe(accepted?.id);
  });

  it("invite codes are single-use", async () => {
    const ws = `ws-reviewer-${Date.now()}-c`;
    const { inviteCodeHash } = await createSeat(ws);
    const first = await repository.acceptReviewerSeat(inviteCodeHash, "user_one");
    const second = await repository.acceptReviewerSeat(inviteCodeHash, "user_two");
    expect(first?.clerkUserId).toBe("user_one");
    expect(second).toBeNull();
  });

  it("expired invites cannot be accepted", async () => {
    const ws = `ws-reviewer-${Date.now()}-d`;
    const { inviteCodeHash } = await createSeat(ws, {
      expiresAt: new Date(Date.now() - 1000),
    });
    const accepted = await repository.acceptReviewerSeat(inviteCodeHash, "user_late");
    expect(accepted).toBeNull();
  });

  it("revoking an accepted seat clears the active reviewer", async () => {
    const ws = `ws-reviewer-${Date.now()}-e`;
    const { inviteCodeHash } = await createSeat(ws);
    const accepted = await repository.acceptReviewerSeat(inviteCodeHash, "user_reviewer_2");
    expect(accepted).not.toBeNull();

    const revoked = await repository.revokeReviewerSeat(ws, accepted!.id);
    expect(revoked?.status).toBe("revoked");
    expect(await repository.getAcceptedReviewerSeat(ws)).toBeNull();

    // Revoking twice is a no-op failure, not a crash.
    expect(await repository.revokeReviewerSeat(ws, accepted!.id)).toBeNull();
  });

  it("revoke is workspace-scoped", async () => {
    const ws = `ws-reviewer-${Date.now()}-f`;
    const { seat } = await createSeat(ws);
    const stolen = await repository.revokeReviewerSeat("ws-other", seat.id);
    expect(stolen).toBeNull();
  });

  it("resend rotates the invite code: old code stops working, new code accepts", async () => {
    const ws = `ws-reviewer-${Date.now()}-g`;
    const { seat, inviteCodeHash: oldHash } = await createSeat(ws);

    const newCode = randomBytes(24).toString("base64url");
    const newHash = createHash("sha256").update(newCode).digest("hex");
    const refreshed = await repository.refreshReviewerInvite(ws, seat.id, newHash, new Date(Date.now() + 86_400_000));
    expect(refreshed?.id).toBe(seat.id);

    expect(await repository.acceptReviewerSeat(oldHash, "user_old")).toBeNull();
    const accepted = await repository.acceptReviewerSeat(newHash, "user_new");
    expect(accepted?.clerkUserId).toBe("user_new");
  });

  it("refresh only works on invited seats, not accepted ones", async () => {
    const ws = `ws-reviewer-${Date.now()}-h`;
    const { inviteCodeHash } = await createSeat(ws);
    const accepted = await repository.acceptReviewerSeat(inviteCodeHash, "user_bound");
    const rotated = await repository.refreshReviewerInvite(ws, accepted!.id, "deadbeef", new Date(Date.now() + 86_400_000));
    expect(rotated).toBeNull();
  });
});
