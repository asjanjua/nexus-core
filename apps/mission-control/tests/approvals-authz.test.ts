/**
 * Reviewer-seat slice 3 — restrict approval rights.
 *
 * Once a workspace has an accepted, identity-bound reviewer seat, only that
 * reviewer (as a signed-in human) may approve/reject. Bearer/agent tokens stay
 * a break-glass path. Without an accepted seat, behaviour is unchanged.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");
  return { ...actual, requireScope: vi.fn() };
});

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getAcceptedReviewerSeat: vi.fn(),
    updateRecommendationStatusForWorkspace: vi.fn().mockResolvedValue({ id: "rec-1", status: "approved" }),
    pushAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const mockRequireScope = vi.mocked(requireScope);
const mockRepo = vi.mocked(repository);

function ctx(overrides: Partial<{ userId: string; authType: "session" | "bearer" }> = {}) {
  return {
    workspaceId: "ws-1",
    userId: overrides.userId ?? "user_reviewer",
    scopes: ["*"],
    authType: overrides.authType ?? ("session" as const),
  };
}

function post(recommendationId = "rec-1") {
  return import("@/app/api/approvals/[recommendationId]/route").then(({ POST }) =>
    POST(
      new Request("http://localhost/api/approvals/rec-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ recommendationId }) }
    )
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.updateRecommendationStatusForWorkspace.mockResolvedValue({ id: "rec-1", status: "approved" } as never);
  mockRepo.pushAudit.mockResolvedValue(undefined as never);
});

describe("approval rights restriction (reviewer-seat slice 3)", () => {
  it("allows approval when no accepted reviewer seat exists", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx(), error: null } as never);
    mockRepo.getAcceptedReviewerSeat.mockResolvedValue(null as never);

    const res = await post();
    expect(res.status).toBe(200);
    expect(mockRepo.updateRecommendationStatusForWorkspace).toHaveBeenCalled();
  });

  it("allows approval when the caller IS the bound reviewer", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "user_bound" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeat.mockResolvedValue({ id: "rs-1", clerkUserId: "user_bound" } as never);

    const res = await post();
    expect(res.status).toBe(200);
    expect(mockRepo.updateRecommendationStatusForWorkspace).toHaveBeenCalled();
  });

  it("rejects a signed-in caller who is NOT the bound reviewer", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "user_other" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeat.mockResolvedValue({ id: "rs-1", clerkUserId: "user_bound" } as never);

    const res = await post();
    expect(res.status).toBe(403);
    expect(mockRepo.updateRecommendationStatusForWorkspace).not.toHaveBeenCalled();
    expect(mockRepo.pushAudit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "approval.denied_not_bound_reviewer" })
    );
  });

  it("allows a bearer/agent token as break-glass even when it is not the bound reviewer", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "key_agent", authType: "bearer" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeat.mockResolvedValue({ id: "rs-1", clerkUserId: "user_bound" } as never);

    const res = await post();
    expect(res.status).toBe(200);
    expect(mockRepo.updateRecommendationStatusForWorkspace).toHaveBeenCalled();
  });
});
