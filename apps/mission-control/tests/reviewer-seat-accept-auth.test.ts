import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAuth: vi.fn(),
  currentUser: vi.fn(),
  acceptReviewerSeat: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveAuth: mocks.resolveAuth,
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    acceptReviewerSeat: mocks.acceptReviewerSeat,
    upsertStrategyProfile: vi.fn().mockResolvedValue(null),
    pushAudit: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
}));

import { POST } from "@/app/api/reviewer-seat/accept/route";

const inviteCode = "a".repeat(32);
const inviteHash = createHash("sha256").update(inviteCode).digest("hex");

function request() {
  return new Request("https://app.pinavia.io/api/reviewer-seat/accept", {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveAuth.mockResolvedValue({
    workspaceId: "org_demo",
    userId: "user_reviewer",
    scopes: ["*"],
    authType: "session",
    isOrgAdmin: false,
  });
  mocks.currentUser.mockResolvedValue({
    id: "user_reviewer",
    emailAddresses: [{ emailAddress: "Reviewer@Pinavia.io", verification: { status: "verified" } }],
  });
  mocks.acceptReviewerSeat.mockResolvedValue({
    id: "seat_1",
    workspaceId: "org_demo",
    email: "reviewer@pinavia.io",
    name: "Demo reviewer",
  });
});

describe("reviewer invite acceptance", () => {
  it("only consumes an invite with the accepting user's verified email", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    // The fourth argument is the caller's own workspace: the seat lookup is
    // bound to it so a leaked code cannot redeem a seat in another tenant.
    expect(mocks.acceptReviewerSeat).toHaveBeenCalledWith(
      inviteHash,
      "user_reviewer",
      ["reviewer@pinavia.io"],
      "org_demo",
    );
  });

  it("rejects an organization admin before consuming the invite", async () => {
    mocks.resolveAuth.mockResolvedValue({
      workspaceId: "org_demo",
      userId: "user_admin",
      scopes: ["*"],
      authType: "session",
      isOrgAdmin: true,
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "reviewer_requires_non_admin_member" });
    expect(mocks.acceptReviewerSeat).not.toHaveBeenCalled();
  });

  it("rejects an unverified email before consuming the invite", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "user_reviewer",
      emailAddresses: [{ emailAddress: "reviewer@pinavia.io", verification: { status: "pending" } }],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "reviewer_email_unverified" });
    expect(mocks.acceptReviewerSeat).not.toHaveBeenCalled();
  });

  it("rejects a stale Clerk identity before consuming the invite", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "user_someone_else",
      emailAddresses: [{ emailAddress: "reviewer@pinavia.io", verification: { status: "verified" } }],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "reviewer_identity_verification_failed" });
    expect(mocks.acceptReviewerSeat).not.toHaveBeenCalled();
  });
});
