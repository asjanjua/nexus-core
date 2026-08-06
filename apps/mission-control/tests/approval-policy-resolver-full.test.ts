import { describe, expect, it } from "vitest";

/**
 * Full approval policy resolver tests — all four modes, break-glass,
 * reject-ends-chain, sequential ordering, staffing edge cases.
 */

// ---------------------------------------------------------------------------
// Inlined types
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

interface Decision {
  allowed: boolean;
  reason?: string;
  detail?: string;
  matchedSeat?: { seatId: string; role: string | null; level: number | null };
  terminal?: boolean;
  remaining?: number;
}

// ---------------------------------------------------------------------------
// Resolver (standalone — mirrors approval-policy-resolver.ts)
// ---------------------------------------------------------------------------

function resolveApprovalDecision(
  policy: Policy | null,
  seats: Seat[],
  callerUserId: string | null,
  isBreakGlass: boolean,
  priorDecisions: Prior[],
): Decision {
  const mode = policy?.mode ?? "single";

  // Reject ends chain.
  if (priorDecisions.some((d) => !d.approved)) {
    return { allowed: false, reason: "not_eligible", detail: "A prior approver rejected this item." };
  }

  // Eligible set per mode.
  let eligible: Seat[];
  switch (mode) {
    case "single": case "n_of_m":
      eligible = seats; break;
    case "role_scoped":
      eligible = seats.filter((s) => s.role && (policy?.requiredRoles ?? []).includes(s.role)); break;
    case "sequential":
      eligible = seats.filter((s) => s.level != null).sort((a, b) => (a.level ?? 0) - (b.level ?? 0)); break;
  }

  // Break-glass.
  if (isBreakGlass) {
    if (policy?.allowBreakGlass === false) {
      return { allowed: false, reason: "not_eligible", detail: "Break-glass is disabled." };
    }
    const anchor = eligible.find((s) => s.role !== null) ?? eligible[0];
    if (!anchor) return { allowed: false, reason: "policy_unsatisfiable", detail: "No eligible seats." };
    return { allowed: true, matchedSeat: { seatId: anchor.id, role: anchor.role, level: anchor.level }, terminal: true };
  }

  // Session caller.
  if (!callerUserId) {
    return { allowed: false, reason: "no_bound_reviewer", detail: "No identity-bound caller." };
  }
  const seat = seats.find((s) => s.clerkUserId === callerUserId);
  if (!seat) {
    return { allowed: false, reason: "no_bound_reviewer", detail: "Caller has no accepted seat." };
  }

  // Eligible?
  if (!eligible.some((e) => e.id === seat.id)) {
    return { allowed: false, reason: "wrong_role", detail: "Not in eligible set." };
  }

  // Sequential step check.
  if (mode === "sequential") {
    const levels = [...new Set(eligible.map((s) => s.level))].sort((a, b) => (a ?? 0) - (b ?? 0));
    const approvedLevels = new Set(priorDecisions.filter((d) => d.approved).map((d) => eligible.find((e) => e.id === d.seatId)?.level));
    const nextLevel = levels.find((l) => !approvedLevels.has(l));
    if (seat.level !== nextLevel) {
      return { allowed: false, reason: "wrong_step", detail: `Next is level ${nextLevel}.` };
    }
  }

  // Terminal check.
  const priorEligibleApprovals = priorDecisions.filter((d) => d.approved && eligible.some((e) => e.id === d.seatId)).length;
  let terminal = false;
  let remaining: number | undefined;

  switch (mode) {
    case "single":
      terminal = true; break;
    case "n_of_m":
      remaining = (policy?.requiredCount ?? 1) - priorEligibleApprovals - 1;
      terminal = remaining <= 0; break;
    case "role_scoped":
      terminal = (policy?.requiredRoles ?? []).every((r) =>
        priorDecisions.filter((d) => d.approved).some((d) => eligible.find((e) => e.id === d.seatId)?.role === r)
        || seat.role === r
      ); break;
    case "sequential":
      terminal = seat.level === [...new Set(eligible.map((s) => s.level))].sort((a, b) => (a ?? 0) - (b ?? 0)).pop(); break;
  }

  return {
    allowed: true,
    matchedSeat: { seatId: seat.id, role: seat.role, level: seat.level },
    terminal,
    remaining,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s(id: string, clerkUserId: string, role: string | null = "reviewer", level: number | null = null): Seat {
  return { id, clerkUserId, role, level, team: null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveApprovalDecision — single mode", () => {
  it("allows the accepted seat to approve", () => {
    const d = resolveApprovalDecision(null, [s("1", "a")], "a", false, []);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(true);
  });

  it("denies an unseated caller", () => {
    const d = resolveApprovalDecision(null, [s("1", "a")], "b", false, []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("no_bound_reviewer");
  });

  it("denies when no seats exist", () => {
    const d = resolveApprovalDecision(null, [], "a", false, []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("no_bound_reviewer");
  });
});

describe("resolveApprovalDecision — n_of_m mode", () => {
  const policy: Policy = { mode: "n_of_m", requiredCount: 2 };

  it("first approver is not terminal", () => {
    const d = resolveApprovalDecision(policy, [s("1", "a"), s("2", "b")], "a", false, []);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(false);
    expect(d.remaining).toBe(1);
  });

  it("second approver is terminal", () => {
    const d = resolveApprovalDecision(policy, [s("1", "a"), s("2", "b")], "b", false, [
      { seatId: "1", approved: true },
    ]);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(true);
    expect(d.remaining).toBe(0);
  });

  it("reports terminal=true for a redundant caller after the chain is already complete", () => {
    const d = resolveApprovalDecision(policy, [s("1", "a"), s("2", "b"), s("3", "c")], "c", false, [
      { seatId: "1", approved: true },
      { seatId: "2", approved: true },
    ]);
    // The third caller IS allowed (all seats are eligible in n_of_m),
    // but the policy condition is already satisfied, so terminal=true.
    // This is an audit no-op — the recommendation was already terminal.
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(true);
    expect(d.remaining).toBe(-1);
  });
});

describe("resolveApprovalDecision — sequential mode", () => {
  const policy: Policy = { mode: "sequential", requiredCount: 2 };

  it("allows level 1 first", () => {
    const d = resolveApprovalDecision(policy, [
      { ...s("1", "a"), level: 1 },
      { ...s("2", "b"), level: 2 },
    ], "a", false, []);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(false);
  });

  it("denies level 2 before level 1", () => {
    const d = resolveApprovalDecision(policy, [
      { ...s("1", "a"), level: 1 },
      { ...s("2", "b"), level: 2 },
    ], "b", false, []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("wrong_step");
  });

  it("allows level 2 after level 1 approves", () => {
    const d = resolveApprovalDecision(policy, [
      { ...s("1", "a"), level: 1 },
      { ...s("2", "b"), level: 2 },
    ], "b", false, [
      { seatId: "1", approved: true },
    ]);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(true);
  });
});

describe("resolveApprovalDecision — role_scoped mode", () => {
  const policy: Policy = { mode: "role_scoped", requiredRoles: ["compliance", "sponsor"] };

  it("allows a compliance seat", () => {
    const d = resolveApprovalDecision(policy, [
      { ...s("1", "a"), role: "compliance" },
      { ...s("2", "b"), role: "sponsor" },
    ], "a", false, []);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(false);
  });

  it("denies a reviewer seat when only compliance/sponsor are required", () => {
    const d = resolveApprovalDecision(policy, [
      { ...s("1", "a"), role: "reviewer" },
      { ...s("2", "b"), role: "sponsor" },
    ], "a", false, []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("wrong_role");
  });
});

describe("resolveApprovalDecision — break-glass", () => {
  it("allows break-glass with any accepted seat as anchor", () => {
    const d = resolveApprovalDecision(null, [s("1", "a")], null, true, []);
    expect(d.allowed).toBe(true);
    expect(d.terminal).toBe(true);
  });

  it("denies break-glass when policy disallows it", () => {
    const d = resolveApprovalDecision({ mode: "single", allowBreakGlass: false }, [s("1", "a")], null, true, []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("not_eligible");
  });
});

describe("resolveApprovalDecision — reject ends chain", () => {
  it("denies after a prior rejection", () => {
    const d = resolveApprovalDecision(null, [s("1", "a"), s("2", "b")], "b", false, [
      { seatId: "1", approved: false },
    ]);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("not_eligible");
  });

  it("denies even the rejecting seat if they try again", () => {
    const d = resolveApprovalDecision(null, [s("1", "a"), s("2", "b")], "a", false, [
      { seatId: "1", approved: false },
    ]);
    expect(d.allowed).toBe(false);
  });
});
