import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * getWorkspacePlanSummary had no test at all, which is how
 * `team: { used: 1 }` and `roles: { used: 0 }` survived as hardcoded literals
 * with a "TBD" comment.
 *
 * Those are the figures the pricing page sells against — Starter is "1 to 10
 * people" — so the usage panel was showing a seat count with no relationship
 * to the workspace. A ten-person team and a one-person team both read "1".
 *
 * This covers the counts, the limits, and the degradation path, because the
 * `.catch` fallbacks mean a missing repository method fails silently rather
 * than loudly. That is exactly how a hardcoded value hides.
 */

const billingState = {
  plan: "pro" as const,
  monthlyTokenLimit: 5_000_000,
  monthlyTokenUsed: 1_000_000,
  tokenResetAt: "2026-09-01T00:00:00.000Z",
  status: "active",
  planChangedAt: null as string | null,
};

const planDef = {
  planKey: "pro",
  label: "Starter",
  priceCents: 4_900,
  monthlyTokens: 5_000_000,
  maxRoles: 5,
  maxEvidence: 1000,
  maxTeam: 10,
  maxConnectors: 0,
  maxApiKeys: 3,
  askDailyLimit: null,
  scheduledSynthesis: true,
  synthesisMaxCadence: "weekly",
  emailDelivery: false,
  slackDelivery: false,
  exportsEnabled: true,
  decisionExtraction: false,
  customPassports: false,
  dataResidency: false,
  apiAccess: true,
  watermark: false,
  stripePriceId: null,
};

const repo = {
  getWorkspaceBillingState: vi.fn(async () => billingState),
  getPlanDefinition: vi.fn(async () => planDef),
  getEvidenceForWorkspace: vi.fn(async () => [{ id: "e1" }, { id: "e2" }]),
  listAgentKeys: vi.fn(async () => [{ id: "k1" }]),
  countWorkspaceSeats: vi.fn(async () => ({ members: 7, roles: 9 })),
};

vi.mock("@/lib/data/repository", () => ({ repository: repo }));
vi.mock("@/lib/observability/sentry", () => ({ captureHandledError: vi.fn() }));

const { getWorkspacePlanSummary } = await import("@/lib/billing/budget");

beforeEach(() => {
  repo.countWorkspaceSeats.mockResolvedValue({ members: 7, roles: 9 });
});

describe("getWorkspacePlanSummary", () => {
  it("reports the real member count, not a hardcoded 1", async () => {
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.limits.team.used).toBe(7);
    expect(summary.limits.team.limit).toBe(10);
  });

  it("reports the real role count, not a hardcoded 0", async () => {
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.limits.roles.used).toBe(9);
    expect(summary.limits.roles.limit).toBe(5);
  });

  it("surfaces a workspace already over its seat limit", async () => {
    // The panel has to be able to show this, or overage is invisible to both
    // the customer and to us. Nothing enforces the cap yet; showing the truth
    // is the prerequisite for deciding what to do about it.
    repo.countWorkspaceSeats.mockResolvedValue({ members: 40, roles: 40 });
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.limits.team.used).toBeGreaterThan(summary.limits.team.limit);
  });

  it("counts evidence and API keys from the real collections", async () => {
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.limits.evidence.used).toBe(2);
    expect(summary.limits.apiKeys.used).toBe(1);
  });

  it("takes price and label from the plan definition", async () => {
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.priceCents).toBe(4_900);
    expect(summary.planLabel).toBe("Starter");
  });

  it("degrades to zero seats rather than throwing when the count fails", async () => {
    // The panel must still render. Zero is visibly wrong in a way a stale
    // hardcoded 1 was not, so a failure here is noticeable instead of silent.
    repo.countWorkspaceSeats.mockRejectedValue(new Error("db down"));
    const summary = await getWorkspacePlanSummary("ws-1");
    expect(summary.limits.team.used).toBe(0);
    expect(summary.limits.roles.used).toBe(0);
  });
});
