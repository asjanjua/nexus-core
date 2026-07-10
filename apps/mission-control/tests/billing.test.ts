/**
 * Billing Tiers — unit tests (v0.20.0)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkTokenBudget, canUseFeature, invalidateBudgetCache } from "@/lib/billing/budget";
import { ask } from "@/lib/services/llm";

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------

const mockBillingState = {
  plan: "free" as const,
  monthlyTokenLimit: 500_000,
  monthlyTokenUsed: 100_000,
  tokenResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  planChangedAt: null as string | null,
};

const mockPlanDef = {
  planKey: "free", label: "Free", priceCents: 0,
  monthlyTokens: 500_000, maxRoles: 1, maxEvidence: 50, maxTeam: 1,
  maxConnectors: 0, maxApiKeys: 0, askDailyLimit: 10,
  scheduledSynthesis: false, synthesisMaxCadence: null,
  emailDelivery: false, slackDelivery: false, exportsEnabled: false,
  decisionExtraction: false, customPassports: false, dataResidency: false,
  apiAccess: false, watermark: true, stripePriceId: null,
};

const mockProPlanDef = {
  ...mockPlanDef,
  planKey: "pro", label: "Pro", priceCents: 49900,
  monthlyTokens: 5_000_000,
  scheduledSynthesis: true, synthesisMaxCadence: "weekly",
  exportsEnabled: true, apiAccess: true, watermark: false,
};

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getWorkspaceBillingState: vi.fn(async () => mockBillingState),
    getPlanDefinition: vi.fn(async () => mockPlanDef),
    listAgentKeys: vi.fn(async () => []),
    getEvidenceForWorkspace: vi.fn(async () => []),
    recordLLMUsage: vi.fn(async () => undefined),
    getWorkspaceSettings: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/security/ai-policy", () => ({
  isProviderAllowed: vi.fn(() => true),
}));

import { repository } from "@/lib/data/repository";
const mockGetBillingState = vi.mocked(repository.getWorkspaceBillingState);
const mockGetPlanDef = vi.mocked(repository.getPlanDefinition);

function setUsed(used: number, limit = 500_000, plan: "free" | "pro" | "business" | "enterprise" = "free") {
  mockGetBillingState.mockResolvedValue({
    ...mockBillingState, plan, monthlyTokenLimit: limit, monthlyTokenUsed: used,
  });
}

// ---------------------------------------------------------------------------
// checkTokenBudget
// ---------------------------------------------------------------------------

describe("checkTokenBudget", () => {
  const WS = "ws-budget-test";

  beforeEach(() => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockResolvedValue(mockBillingState);
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
  });

  it("allows when token usage is below limit", async () => {
    setUsed(100_000, 500_000);
    const status = await checkTokenBudget(WS);
    expect(status.allowed).toBe(true);
    expect(status.used).toBe(100_000);
    expect(status.percentUsed).toBe(20);
  });

  it("blocks when token usage meets limit", async () => {
    setUsed(500_000, 500_000);
    const status = await checkTokenBudget(WS);
    expect(status.allowed).toBe(false);
    expect(status.percentUsed).toBe(100);
  });

  it("blocks when token usage exceeds limit", async () => {
    setUsed(600_000, 500_000);
    const status = await checkTokenBudget(WS);
    expect(status.allowed).toBe(false);
    expect(status.percentUsed).toBe(100);
  });

  it("allows unlimited (enterprise) when limit is 0", async () => {
    setUsed(999_999_999, 0, "enterprise");
    const status = await checkTokenBudget(WS);
    expect(status.allowed).toBe(true);
    expect(status.percentUsed).toBe(0);
  });

  it("returns permissive fallback when DB throws", async () => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockRejectedValue(new Error("db down"));
    const status = await checkTokenBudget(WS);
    expect(status.allowed).toBe(true);
    expect(status.plan).toBe("free");
  });
});

// ---------------------------------------------------------------------------
// canUseFeature
// ---------------------------------------------------------------------------

describe("canUseFeature", () => {
  const WS = "ws-feature-test";

  beforeEach(() => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockResolvedValue(mockBillingState);
  });

  it("free plan blocks scheduled_synthesis", async () => {
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
    const result = await canUseFeature(WS, "scheduled_synthesis");
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe("pro");
  });

  it("pro plan allows scheduled_synthesis", async () => {
    mockGetBillingState.mockResolvedValue({ ...mockBillingState, plan: "pro" });
    mockGetPlanDef.mockResolvedValue(mockProPlanDef);
    const result = await canUseFeature(WS, "scheduled_synthesis");
    expect(result.allowed).toBe(true);
  });

  it("free plan blocks api_access", async () => {
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
    const result = await canUseFeature(WS, "api_access");
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe("pro");
  });

  it("returns fallback-allow on DB error", async () => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockRejectedValue(new Error("db down"));
    const result = await canUseFeature(WS, "exports");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Budget gate in ask()
// ---------------------------------------------------------------------------

describe("ask() budget gate", () => {
  const WS = "ws-ask-test";

  beforeEach(() => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockResolvedValue(mockBillingState);
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
  });

  it("returns budget-exceeded message when budget exhausted", async () => {
    setUsed(500_000, 500_000);
    const response = await ask("test prompt", "system", { workspaceId: WS });
    expect(response).toContain("monthly AI budget");
    expect(response).toContain("100%");
  });

  it("no workspaceId bypasses budget gate", async () => {
    // Without workspaceId, ask() should not gate on budget.
    // It will fall through to LLM (which returns fallback without API key).
    const response = await ask("test prompt", "system", {});
    expect(response).not.toContain("monthly AI budget");
  });
});

// ---------------------------------------------------------------------------
// Cache behaviour
// ---------------------------------------------------------------------------

describe("budget cache", () => {
  const WS = "ws-cache-test";

  beforeEach(() => {
    invalidateBudgetCache(WS);
    mockGetBillingState.mockResolvedValue(mockBillingState);
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
    vi.clearAllMocks();
    // Re-set after clearAllMocks
    mockGetBillingState.mockResolvedValue(mockBillingState);
    mockGetPlanDef.mockResolvedValue(mockPlanDef);
  });

  it("returns cached entry without a second DB call", async () => {
    await checkTokenBudget(WS);
    await checkTokenBudget(WS);
    expect(mockGetBillingState).toHaveBeenCalledTimes(1);
  });

  it("invalidateBudgetCache forces a fresh DB read", async () => {
    await checkTokenBudget(WS);
    invalidateBudgetCache(WS);
    await checkTokenBudget(WS);
    expect(mockGetBillingState).toHaveBeenCalledTimes(2);
  });
});
