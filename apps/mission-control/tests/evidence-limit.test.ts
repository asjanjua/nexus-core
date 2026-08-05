import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * checkEvidenceLimit had no test, and three things were wrong with it.
 *
 * It read PLAN_FALLBACKS directly while the other three plan lookups in the
 * same file consult the DB definition first, so a workspace on a negotiated
 * Enterprise ceiling would have been measured against the hardcoded default
 * instead of its contract.
 *
 * It returned `requiredPlan: "pro"` unconditionally, so a Starter customer who
 * hit their ceiling was told to upgrade to the plan they were already paying
 * for.
 *
 * And nothing calls it. The evidence ceiling is sold on /pricing and enforced
 * nowhere, exactly as `maxTeam` was. Wiring it is a product decision; these
 * tests make sure it is correct whenever that happens.
 */

const getWorkspaceBillingState = vi.fn(async (_ws: string) => ({ plan: "pro" }) as { plan: string } | null);
const getEvidenceForWorkspace = vi.fn(async (_ws: string) => [] as Array<{ id: string }>);
const getPlanDefinition = vi.fn(
  async (_plan: string) => null as { maxEvidence: number } | null
);
const captureHandledError = vi.fn();

vi.mock("@/lib/data/repository", () => ({
  repository: { getWorkspaceBillingState, getEvidenceForWorkspace, getPlanDefinition },
}));
vi.mock("@/lib/observability/sentry", () => ({ captureHandledError }));

const { checkEvidenceLimit } = await import("@/lib/billing/budget");

/** n evidence records. */
const docs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}` }));

beforeEach(() => {
  getWorkspaceBillingState.mockReset().mockResolvedValue({ plan: "pro" });
  getEvidenceForWorkspace.mockReset().mockResolvedValue([]);
  getPlanDefinition.mockReset().mockResolvedValue(null);
  captureHandledError.mockReset();
});

describe("checkEvidenceLimit", () => {
  it("allows a workspace below its ceiling", async () => {
    getEvidenceForWorkspace.mockResolvedValue(docs(10));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(10);
    expect(result.limit).toBe(1000);
    expect(result.requiredPlan).toBeUndefined();
  });

  it("blocks exactly at the ceiling, not one past it", async () => {
    // `used < limit`. At 1000 of 1000 the next upload is the 1001st.
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(false);
  });

  it("names the NEXT tier, not the one already paid for", async () => {
    // The bug: this said "pro" unconditionally, so a Starter customer at their
    // ceiling was told to upgrade to Starter.
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.requiredPlan).toBe("Growth");
    expect(result.requiredPlan).not.toBe("Starter");
  });

  it("points a Growth workspace at Enterprise", async () => {
    getWorkspaceBillingState.mockResolvedValue({ plan: "business" });
    getEvidenceForWorkspace.mockResolvedValue(docs(5000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.requiredPlan).toBe("Enterprise");
  });

  it("points a free workspace at the first paid tier", async () => {
    getWorkspaceBillingState.mockResolvedValue({ plan: "free" });
    getEvidenceForWorkspace.mockResolvedValue(docs(50));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe("Starter");
  });

  it("treats -1 as unlimited and never blocks Enterprise", async () => {
    getWorkspaceBillingState.mockResolvedValue({ plan: "enterprise" });
    getEvidenceForWorkspace.mockResolvedValue(docs(100_000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(true);
    expect(result.requiredPlan).toBeUndefined();
  });

  it("has no tier to suggest at the top of the ladder", async () => {
    // A negotiated Enterprise ceiling can still be finite. There is nothing
    // above it to sell, so the prompt must be absent rather than invented.
    getWorkspaceBillingState.mockResolvedValue({ plan: "enterprise" });
    getPlanDefinition.mockResolvedValue({ maxEvidence: 50_000 });
    getEvidenceForWorkspace.mockResolvedValue(docs(50_000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBeUndefined();
  });

  it("honours a DB plan definition over the static fallback", async () => {
    // A contract ceiling has to beat the hardcoded default, or a customer who
    // paid for more is measured against less.
    getPlanDefinition.mockResolvedValue({ maxEvidence: 25_000 });
    getEvidenceForWorkspace.mockResolvedValue(docs(5_000));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.limit).toBe(25_000);
    expect(result.allowed).toBe(true);
  });

  it("falls back to the static definition when the DB has no row", async () => {
    getPlanDefinition.mockResolvedValue(null);
    const result = await checkEvidenceLimit("ws-1");
    expect(result.limit).toBe(1000);
  });

  it("fails open rather than blocking uploads when the lookup breaks", async () => {
    // Refusing evidence because the billing DB is unreachable would break the
    // product's core action over a billing outage.
    getEvidenceForWorkspace.mockRejectedValue(new Error("db down"));
    const result = await checkEvidenceLimit("ws-1");
    expect(result.allowed).toBe(true);
  });

  it("reports the failure rather than failing open silently", async () => {
    // Sustained failure means limits are not enforced at all, which is
    // invisible from the outside.
    getEvidenceForWorkspace.mockRejectedValue(new Error("db down"));
    await checkEvidenceLimit("ws-1");
    expect(captureHandledError).toHaveBeenCalledTimes(1);
    expect(captureHandledError.mock.calls[0][1]).toMatchObject({
      errorType: "evidence_limit_failed_open",
      workspaceId: "ws-1",
    });
  });
});
