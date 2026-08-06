/**
 * Approval rights restriction — slice-3 tests updated for approval-policy
 * resolver (migration 0046). The resolver replaces the single-seat check
 * with a policy-aware resolveApprovalDecision call.
 *
 * Updated 2026-08-06: added getActiveApprovalPolicy, getAcceptedReviewerSeats,
 * getAuditEvents to mock. Audit type changed from approval.denied_not_bound_reviewer
 * to approval.denied (the resolver uses a unified denied audit with a reason field).
 *
 * Uses vi.importActual for @ alias resolution (vitest doesn't resolve @ in static imports).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");
  return { ...actual, requireScope: vi.fn() };
});

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getAcceptedReviewerSeat: vi.fn(),
    getActiveApprovalPolicy: vi.fn().mockResolvedValue(null),
    getAcceptedReviewerSeats: vi.fn().mockResolvedValue([]),
    getAuditEvents: vi.fn().mockResolvedValue([]),
    updateRecommendationStatusForWorkspace: vi.fn().mockResolvedValue({ id: "rec-1", status: "approved" }),
    pushAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

const { requireScope } = await import("@/lib/api-auth");
const { repository } = await import("@/lib/data/repository");

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
      { params: Promise.resolve({ recommendationId }) },
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.updateRecommendationStatusForWorkspace.mockResolvedValue({ id: "rec-1", status: "approved" } as never);
  mockRepo.pushAudit.mockResolvedValue(undefined as never);
  mockRepo.getActiveApprovalPolicy.mockResolvedValue(null);
  mockRepo.getAcceptedReviewerSeats.mockResolvedValue([]);
  mockRepo.getAuditEvents.mockResolvedValue([]);
});

describe("approval rights restriction (policy-aware — migration 0046)", () => {
  it("denies a session caller when no accepted seats exist (policy-aware: single mode requires a seat)", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx(), error: null } as never);
    mockRepo.getAcceptedReviewerSeats.mockResolvedValue([]);

    const res = await post();
    // No accepted seats → resolver returns no_bound_reviewer → 403.
    // In the slice-3 world this was 200 (no seat → bypass). The policy-aware
    // resolver requires at least one identity-bound seat for session callers.
    expect(res.status).toBe(403);
    expect(mockRepo.updateRecommendationStatusForWorkspace).not.toHaveBeenCalled();
    expect(mockRepo.pushAudit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "approval.denied" }),
    );
  });

  it("allows approval when the caller IS the bound reviewer (single mode)", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "user_bound" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeats.mockResolvedValue([
      { id: "rs-1", clerkUserId: "user_bound", role: "reviewer", level: null, team: null } as never,
    ]);

    const res = await post();
    expect(res.status).toBe(200);
    expect(mockRepo.updateRecommendationStatusForWorkspace).toHaveBeenCalled();
  });

  it("rejects a signed-in caller who is NOT the bound reviewer", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "user_other" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeats.mockResolvedValue([
      { id: "rs-1", clerkUserId: "user_bound", role: "reviewer", level: null, team: null } as never,
    ]);

    const res = await post();
    expect(res.status).toBe(403);
    expect(mockRepo.updateRecommendationStatusForWorkspace).not.toHaveBeenCalled();
    expect(mockRepo.pushAudit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "approval.denied" }),
    );
  });

  it("allows a bearer/agent token as break-glass even when it is not the bound reviewer", async () => {
    mockRequireScope.mockResolvedValue({ ctx: ctx({ userId: "key_agent", authType: "bearer" }), error: null } as never);
    mockRepo.getAcceptedReviewerSeats.mockResolvedValue([
      { id: "rs-1", clerkUserId: "user_bound", role: "reviewer", level: null, team: null } as never,
    ]);

    const res = await post();
    expect(res.status).toBe(200);
    expect(mockRepo.updateRecommendationStatusForWorkspace).toHaveBeenCalled();
  });
});
