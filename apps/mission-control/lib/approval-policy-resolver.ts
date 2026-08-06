/**
 * Approval Policy Resolver
 *
 * Replaces the single-seat check in POST /api/approvals/[recommendationId]
 * with configurable approval rules: single, n_of_m, sequential, role_scoped.
 *
 * export function resolveApprovalDecision(input) — pure resolver. Takes the
 * active policy (or the synthesized "single" default), all accepted seats for
 * the workspace, the caller's identity, and prior decisions on this item.
 *
 * See docs/APPROVAL_POLICIES_SPEC.md §4 for the full spec.
 */

import type {
  ApprovalPolicy,
  ApprovalDecision,
  EligibleApprover,
  ApprovalPolicyMode,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** A seat the resolver can match against. */
export interface ResolverSeat {
  id: string;
  clerkUserId: string;
  role: string | null;
  level: number | null;
  team: string | null;
}

/** A prior approval decision already recorded for this recommendation. */
export interface PriorApproval {
  seatId: string;
  approved: boolean;
}

export interface ResolveInput {
  /** The active policy, or null/undefined for the implicit "single" default. */
  policy: ApprovalPolicy | null | undefined;
  /** All accepted seats for this workspace. */
  seats: ResolverSeat[];
  /** The caller attempting to approve. null = break-glass or unauthenticated. */
  callerUserId: string | null;
  /** Whether the caller is exercising break-glass (bearer/admin token). */
  isBreakGlass: boolean;
  /** Prior approval decisions on this recommendation (from audit log). */
  priorDecisions: PriorApproval[];
}

// ---------------------------------------------------------------------------
// Standalone functions (importable without the resolver module)
// ---------------------------------------------------------------------------

/** Derive the effective mode from a policy or the default. */
export function effectiveMode(policy: ApprovalPolicy | null | undefined): ApprovalPolicyMode {
  return policy?.mode ?? "single";
}

/** Can the policy be satisfied by the currently accepted seats?
 *  Used by buildPilotGates for the staffing check (§5). */
export function isPolicyStaffable(
  policy: ApprovalPolicy | null | undefined,
  seats: ResolverSeat[],
): boolean {
  const mode = effectiveMode(policy);
  const count = policy?.requiredCount ?? 1;

  switch (mode) {
    case "single":
      return seats.length >= 1;
    case "n_of_m":
      return seats.length >= count;
    case "role_scoped": {
      const required = policy?.requiredRoles ?? [];
      const present = new Set(seats.map((s) => s.role).filter(Boolean));
      return required.every((r) => present.has(r));
    }
    case "sequential": {
      const levels = new Set(seats.map((s) => s.level).filter((l) => l != null));
      return levels.size >= count;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveApprovalDecision(input: ResolveInput): ApprovalDecision {
  const { policy, seats, callerUserId, isBreakGlass, priorDecisions } = input;
  const mode = effectiveMode(policy);

  // A reject from any eligible approver ends the chain immediately (§4.5).
  const hasRejection = priorDecisions.some((d) => !d.approved);
  if (hasRejection) {
    return { allowed: false, reason: "not_eligible", detail: "A prior approver rejected this item." };
  }

  // Build eligible set per mode.
  const eligible = computeEligibleSet(mode, seats, policy);

  // Break-glass: if policy allows and caller is bearer/admin, bypass.
  if (isBreakGlass) {
    const allowed = policy?.allowBreakGlass !== false;
    if (!allowed) return { allowed: false, reason: "not_eligible", detail: "Break-glass is disabled for this policy." };
    // Find any seat to attach the audit to (first accepted seat).
    const anchor = seats[0];
    if (!anchor) return { allowed: false, reason: "policy_unsatisfiable", detail: "No accepted seats exist — policy cannot be satisfied." };
    return {
      allowed: true,
      matchedSeat: { seatId: anchor.id, clerkUserId: anchor.clerkUserId, role: anchor.role, level: anchor.level, team: anchor.team },
      terminal: true,
    };
  }

  // Session caller: must have a seat.
  if (!callerUserId) {
    return { allowed: false, reason: "no_bound_reviewer", detail: "No identity-bound caller." };
  }

  // Find the caller's seat.
  const callerSeat = seats.find((s) => s.clerkUserId === callerUserId);
  if (!callerSeat) {
    return { allowed: false, reason: "no_bound_reviewer", detail: "Caller has no accepted reviewer seat." };
  }

  // Is the caller in the eligible set for this mode?
  const isEligible = eligible.some((e) => e.clerkUserId === callerUserId);
  if (!isEligible) {
    return { allowed: false, reason: "wrong_role", detail: "Your seat does not match the required role for this step." };
  }

  // Sequential: must be the caller's turn.
  if (mode === "sequential") {
    // Use the eligible set (leveled seats only) rather than all seats, so
    // unleveled seats or role-scoped exclusions don't affect the sequence.
    // Reviewed 2026-08-06: prior code passed `seats` here, which included
    // all accepted seats regardless of level — wrong for role+sequential combos.
    const nextLevel = nextSequentialLevel(eligible, priorDecisions);
    if (nextLevel == null) {
      return { allowed: false, reason: "not_eligible", detail: "The approval chain is already complete." };
    }
    if (callerSeat.level !== nextLevel) {
      return { allowed: false, reason: "wrong_step", detail: `Current approval step is level ${nextLevel}. Your level is ${callerSeat.level ?? "unset"}.` };
    }
  }

  // Count prior approvals from the eligible set for n_of_m terminal check.
  // Uses eligible.seatId which maps from ResolverSeat.id via computeEligibleSet.
  // Both seats and eligible use the same underlying ID values — seats has `id`,
  // eligible maps it to `seatId`, so comparison against PriorApproval.seatId
  // works in both directions.
  const priorEligibleApprovals = priorDecisions.filter((d) =>
    d.approved && eligible.some((e) => e.seatId === d.seatId),
  ).length;

  // Terminal check — determines whether this approval completes the policy
  // condition. n_of_m checks required_count vs prior approvals. role_scoped
  // checks whether every required role has been approved (including the
  // current caller). sequential checks whether the caller is at the highest
  // level in the chain.
  let terminal = false;
  let remaining: number | undefined;
  switch (mode) {
    case "single":
      terminal = true;
      break;
    case "n_of_m": {
      const needed = policy?.requiredCount ?? 1;
      remaining = needed - priorEligibleApprovals - 1; // -1 for this approval
      terminal = remaining <= 0;
      break;
    }
    case "role_scoped": {
      const required = policy?.requiredRoles ?? [];
      // Map prior approved decisions to roles by looking up each decision's
      // seatId in the full seats array (persistent IDs, no seatId→id mismatch).
      const alreadyApproved = priorDecisions
        .filter((d) => d.approved)
        .map((d) => seats.find((s) => s.id === d.seatId)?.role)
        .filter(Boolean);
      const currentRole = callerSeat.role;
      // Terminal when every required role is covered by either a prior
      // approver or the current caller. A null-role caller never satisfies
      // a required role (they wouldn't be eligible — the eligibility filter
      // only admits seats whose role is in requiredRoles).
      const stillNeeded = required.filter((r) => !alreadyApproved.includes(r) && r !== currentRole);
      terminal = stillNeeded.length === 0;
      break;
    }
    case "sequential": {
      // Terminal when the caller is at the highest level across all seats
      // (not just eligible — sequential mode admits all leveled seats).
      const levels = [...new Set(seats.map((s) => s.level).filter((l): l is number => l != null))].sort((a, b) => (a ?? 0) - (b ?? 0));
      terminal = callerSeat.level === levels[levels.length - 1];
      break;
    }
  }

  return {
    allowed: true,
    matchedSeat: { seatId: callerSeat.id, clerkUserId: callerSeat.clerkUserId, role: callerSeat.role, level: callerSeat.level, team: callerSeat.team },
    terminal,
    remaining,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the set of seats eligible to approve under the given mode.
 * This is the union — actual authorization happens per-caller in the resolver.
 */
function computeEligibleSet(
  mode: ApprovalPolicyMode,
  seats: ResolverSeat[],
  policy: ApprovalPolicy | null | undefined,
): EligibleApprover[] {
  switch (mode) {
    case "single":
    case "n_of_m":
      return seats.map((s) => ({ seatId: s.id, clerkUserId: s.clerkUserId, role: s.role, level: s.level, team: s.team }));
    case "role_scoped": {
      const required = policy?.requiredRoles ?? [];
      return seats
        .filter((s) => s.role && required.includes(s.role))
        .map((s) => ({ seatId: s.id, clerkUserId: s.clerkUserId, role: s.role, level: s.level, team: s.team }));
    }
    case "sequential":
      return seats
        .filter((s) => s.level != null)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
        .map((s) => ({ seatId: s.id, clerkUserId: s.clerkUserId, role: s.role, level: s.level, team: s.team }));
    default:
      return [];
  }
}

/** The next unapproved level in a sequential chain.
 *  Accepts any object with an `id` and optional `level` — works with both
 *  ResolverSeat and EligibleApprover shapes. */
function nextSequentialLevel(
  leveledSeats: { id?: string; seatId?: string; level?: number | null }[],
  priorDecisions: PriorApproval[],
): number | null {
  const levels = [...new Set(leveledSeats.map((s) => s.level).filter((l): l is number => l != null))].sort((a, b) => a - b);
  const approvedLevels = new Set(
    priorDecisions
      .filter((d) => d.approved)
      .map((d) => leveledSeats.find((s) => (s.id ?? s.seatId) === d.seatId)?.level)
      .filter((l): l is number => l != null),
  );
  return levels.find((l) => !approvedLevels.has(l)) ?? null;
}
