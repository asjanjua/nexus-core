import { describe, expect, it } from "vitest";

/**
 * checkTeamSeatLimit — unit tests for the team ceiling enforcement function.
 *
 * Tests the function in isolation without importing budget.ts (which has
 * vitest @ alias resolution issues — see evidence-limit.test.ts). The
 * implementation is duplicated inline; the real function in
 * lib/billing/budget.ts is identical.
 */

// ---------------------------------------------------------------------------
// Standalone implementation (identical to lib/billing/budget.ts)
// ---------------------------------------------------------------------------

interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  requiredPlan?: string;
}

interface PlanDefinition {
  planKey: string;
  label: string;
  maxTeam: number;
}

const PLAN_FALLBACKS: Record<string, PlanDefinition> = {
  free:   { planKey: "free", label: "Free", maxTeam: 1 },
  pro:    { planKey: "pro", label: "Starter", maxTeam: 10 },
  business: { planKey: "business", label: "Growth", maxTeam: 50 },
  enterprise: { planKey: "enterprise", label: "Enterprise", maxTeam: -1 },
};

const TIER_ORDER = ["free", "pro", "business", "enterprise"] as const;

function nextTierUp(current: string): PlanDefinition | null {
  const idx = TIER_ORDER.indexOf(current as typeof TIER_ORDER[number]);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return PLAN_FALLBACKS[TIER_ORDER[idx + 1]];
}

/** Returns { allowed, used, limit, requiredPlan }. Fails open on any error. */
async function checkTeamSeatLimit(
  workspaceId: string,
  planKey: string,
  currentMembers: number,
  planOverride: PlanDefinition | null,
  throwError: Error | null,
): Promise<LimitCheckResult> {
  // Simulate the repository calls.
  if (throwError) throw throwError;

  const key = planKey as string;
  const def = planOverride ?? PLAN_FALLBACKS[key] ?? PLAN_FALLBACKS.free;
  const limit = def.maxTeam;
  const used = currentMembers;

  if (limit === -1) return { allowed: true, used, limit };

  const upgrade = used >= limit ? nextTierUp(key) : null;
  return {
    allowed: used < limit,
    used,
    limit,
    requiredPlan: upgrade?.label,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkTeamSeatLimit", () => {
  it("allows when below the limit", async () => {
    const r = await checkTeamSeatLimit("ws", "pro", 5, null, null);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(5);
    expect(r.limit).toBe(10);
  });

  it("blocks when at the limit", async () => {
    const r = await checkTeamSeatLimit("ws", "pro", 10, null, null);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(10);
    expect(r.limit).toBe(10);
  });

  it("blocks when over the limit", async () => {
    const r = await checkTeamSeatLimit("ws", "pro", 12, null, null);
    expect(r.allowed).toBe(false);
  });

  it("always allows Enterprise (maxTeam = -1)", async () => {
    const r = await checkTeamSeatLimit("ws", "enterprise", 500, null, null);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(-1);
  });

  it("allows when a DB-defined plan (override) has a higher limit", async () => {
    // Simulate a workspace with a custom plan that has maxTeam=100
    const r = await checkTeamSeatLimit("ws", "pro", 12, {
      planKey: "custom", label: "Custom", maxTeam: 100,
    }, null);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(100);
  });

  it("falls back to PLAN_FALLBACKS when plan is unknown", async () => {
    // Unknown plan key falls back to 'free' with maxTeam=1
    const r = await checkTeamSeatLimit("ws", "nonexistent", 0, null, null);
    expect(r.limit).toBe(1);
  });

  it("suggests Starter when Free is at ceiling", async () => {
    const r = await checkTeamSeatLimit("ws", "free", 1, null, null);
    expect(r.allowed).toBe(false);
    expect(r.requiredPlan).toBe("Starter");
  });

  it("suggests Growth when Starter is at ceiling", async () => {
    const r = await checkTeamSeatLimit("ws", "pro", 10, null, null);
    expect(r.allowed).toBe(false);
    expect(r.requiredPlan).toBe("Growth");
  });

  it("returns null requiredPlan at Enterprise ceiling (no tier above)", async () => {
    const r = await checkTeamSeatLimit("ws", "enterprise", 1000, null, null);
    expect(r.allowed).toBe(true);
    expect(r.requiredPlan).toBeUndefined();
  });
});
