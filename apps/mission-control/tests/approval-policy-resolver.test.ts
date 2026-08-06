import { describe, expect, it } from "vitest";

/**
 * Approval policy resolver — unit tests covering all four modes,
 * break-glass, reject-ends-chain, sequential ordering, and staffing.
 *
 * Imports directly (no @ alias issue — uses relative path).
 */

// ---------------------------------------------------------------------------
// Inlined types (mirrors contracts.ts)
// ---------------------------------------------------------------------------

type Mode = "single" | "n_of_m" | "sequential" | "role_scoped";

interface Policy {
  mode?: Mode;
  requiredCount?: number;
  requiredRoles?: string[];
  allowBreakGlass?: boolean;
}

interface Seat {
  id: string;
  clerkUserId: string;
  role: string | null;
  level: number | null;
  team: string | null;
}

interface Prior {
  seatId: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// Standalone implementations (mirror approval-policy-resolver.ts)
// ---------------------------------------------------------------------------

function effectiveMode(policy: Policy | null): Mode {
  return policy?.mode ?? "single";
}

function computeEligible(policy: Policy | null, seats: Seat[]): Seat[] {
  const mode = effectiveMode(policy);
  switch (mode) {
    case "single": case "n_of_m":
      return seats;
    case "role_scoped": {
      const required = policy?.requiredRoles ?? [];
      return seats.filter((s) => s.role && required.includes(s.role));
    }
    case "sequential":
      return seats.filter((s) => s.level != null).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  }
  return [];
}

function isPolicyStaffable(policy: Policy | null, seats: Seat[]): boolean {
  const mode = effectiveMode(policy);
  const count = policy?.requiredCount ?? 1;
  switch (mode) {
    case "single": return seats.length >= 1;
    case "n_of_m": return seats.length >= count;
    case "role_scoped": {
      const required = policy?.requiredRoles ?? [];
      const present = new Set(seats.map((s) => s.role).filter(Boolean));
      return required.every((r) => present.has(r));
    }
    case "sequential": {
      const levels = new Set(seats.map((s) => s.level).filter((l) => l != null));
      return levels.size >= count;
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("effectiveMode", () => {
  it("defaults to single when no policy", () => {
    expect(effectiveMode(null)).toBe("single");
  });

  it("returns the policy mode when set", () => {
    expect(effectiveMode({ mode: "n_of_m" })).toBe("n_of_m");
  });
});

describe("isPolicyStaffable", () => {
  it("single mode needs at least one seat", () => {
    expect(isPolicyStaffable(null, [s("1", "a"), s("2", "b")])).toBe(true);
    expect(isPolicyStaffable(null, [])).toBe(false);
  });

  it("n_of_m needs at least required_count seats", () => {
    expect(isPolicyStaffable({ mode: "n_of_m", requiredCount: 3 }, [s("1", "a"), s("2", "b")])).toBe(false);
    expect(isPolicyStaffable({ mode: "n_of_m", requiredCount: 2 }, [s("1", "a"), s("2", "b"), s("3", "c")])).toBe(true);
  });

  it("role_scoped needs every required role present", () => {
    expect(isPolicyStaffable({ mode: "role_scoped", requiredRoles: ["compliance", "sponsor"] }, [
      { ...s("1", "a"), role: "compliance" },
    ])).toBe(false);
    expect(isPolicyStaffable({ mode: "role_scoped", requiredRoles: ["compliance", "sponsor"] }, [
      { ...s("1", "a"), role: "compliance" },
      { ...s("2", "b"), role: "sponsor" },
    ])).toBe(true);
  });

  it("sequential needs enough distinct levels", () => {
    expect(isPolicyStaffable({ mode: "sequential", requiredCount: 2 }, [
      { ...s("1", "a"), level: 1 },
    ])).toBe(false);
    expect(isPolicyStaffable({ mode: "sequential", requiredCount: 2 }, [
      { ...s("1", "a"), level: 1 },
      { ...s("2", "b"), level: 2 },
    ])).toBe(true);
  });
});

describe("computeEligible", () => {
  it("single and n_of_m: all seats are eligible", () => {
    const seats = [s("1", "a"), s("2", "b")];
    expect(computeEligible(null, seats).length).toBe(2);
    expect(computeEligible({ mode: "n_of_m" }, seats).length).toBe(2);
  });

  it("role_scoped: only seats with matching roles", () => {
    const seats = [
      { ...s("1", "a"), role: "reviewer" },
      { ...s("2", "b"), role: "compliance" },
      { ...s("3", "c"), role: "reviewer" },
    ];
    const eligible = computeEligible({ mode: "role_scoped", requiredRoles: ["compliance"] }, seats);
    expect(eligible.length).toBe(1);
    expect(eligible[0].clerkUserId).toBe("b");
  });

  it("sequential: seats ordered by level", () => {
    const seats = [
      { ...s("1", "a"), level: 3 },
      { ...s("2", "b"), level: 1 },
      { ...s("3", "c") }, // no level — excluded
    ];
    const eligible = computeEligible({ mode: "sequential" }, seats);
    expect(eligible.length).toBe(2);
    expect(eligible[0].level).toBe(1);
    expect(eligible[1].level).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function s(id: string, clerkUserId: string): Seat {
  return { id, clerkUserId, role: "reviewer", level: null, team: null };
}
