# Approval Policies Specification (Multi-Level, Teams)

Status: P2 design spec. Not yet built. Extends the shipped reviewer-seat model (`reviewer_seats`, migration 0035) without rebuilding it.
Scope: how a workspace moves from "one bound reviewer approves everything" to configurable approval policies (N-of-M, sequential chains, role/team scoping, delegate-on-absence).
Last updated: 2026-07-08.

## 1. Principles

1.1. Human approval stays the trust boundary. Policies only change WHICH humans, in what order, and how many. No policy can approve on a human's behalf, and no policy removes the requirement for at least one identity-bound approver.

1.2. Build against a real org chart, not a hypothetical one. The first pilot's actual approval structure defines the initial policy shapes. Do not pre-build chain types nobody has asked for. Ship the single-reviewer default (already live) plus exactly the shapes the first pilot needs.

1.3. Extend, do not rebuild. `reviewer_seats` already binds a seat to a Clerk identity. Policies add a resolution layer on top: at approval time, resolve the eligible-approver set from the policy, then check the caller against that set. The slice-3 check (caller must be the one bound reviewer) becomes the degenerate case of a policy with one required approver.

1.4. Break-glass survives. Bearer/admin tokens remain an audited override in every policy, so automation and admin recovery are never locked out. This is unchanged from slice 3.

1.5. Fail closed on ambiguity. If a policy cannot resolve a valid approver set (for example every eligible reviewer seat was revoked), approval is denied, not defaulted to open. The workspace is simply not pilot-ready until the policy resolves.

## 2. What Ships Today (Baseline)

2.1. `reviewer_seats` (0035): one accepted, identity-bound seat per workspace. `getAcceptedReviewerSeat(workspaceId)` returns it.

2.2. Pilot gate: `buildPilotGates(strategy, evidence, hasAcceptedReviewerSeat)` blocks `reviewer_named` until a seat is accepted.

2.3. Approval enforcement: `POST /api/approvals/[recommendationId]` allows a `session` caller only when `ctx.userId === seat.clerkUserId`; bearer/admin is break-glass; others get 403 `approval_requires_bound_reviewer`.

This spec generalizes 2.1 to 2.3 without changing their default behavior.

## 3. Data Model Extension

No rewrite of `reviewer_seats`. Two additive changes.

3.1. Seat role and level. Add nullable columns to `reviewer_seats`:

| Column | Type | Meaning |
| --- | --- | --- |
| `role` | text, nullable | Approver role tag, e.g. `reviewer`, `compliance`, `sponsor`, `board`. Null keeps today's generic reviewer. |
| `level` | integer, nullable | Sequence position for chained approval (1 = first). Null means unordered. |
| `team` | text, nullable | Optional team/segment scope so a seat only reviews matching work. |

Backfill: existing accepted seats get `role = 'reviewer'`, `level = null`, `team = null`. Behavior is identical to today.

3.2. Policy table. New `approval_policies` (one active row per workspace, versioned):

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | text pk | Policy id. |
| `workspace_id` | text | Owning workspace. |
| `mode` | text | `single` (default), `n_of_m`, `sequential`, `role_scoped`. |
| `required_count` | integer | For `n_of_m`: how many distinct approvals are needed. |
| `required_roles` | jsonb | For `role_scoped` / `sequential`: ordered or unordered role list. |
| `allow_break_glass` | boolean | Default true. Whether bearer/admin override is permitted. |
| `status` | text | `active` \| `superseded`. |
| `created_at` / `updated_at` | timestamptz | Audit. |

Default when no row exists: `mode = single`, which reproduces slice-3 behavior exactly. Migration is one new table plus three nullable columns. No destructive change.

3.3. Approval progress. For multi-approver modes, approvals accumulate. Record each decision as an audit event (`approval.decision`, already emitted) plus a lightweight `approval_progress` view derived from audit events keyed by `recommendationId`, so no second source of truth is introduced. A recommendation reaches terminal `approved` only when the policy's condition is satisfied.

## 4. Resolution Logic (Approval Time)

Replace the single-seat check in the approvals route with a policy resolver, `resolveApprovalDecision(ctx, recommendationId, workspaceId, decision)`:

4.1. Load the active policy (or the `single` default) and all accepted seats for the workspace.

4.2. Compute the eligible-approver set from `mode`:
- `single`: the one accepted seat. (Today's behavior.)
- `n_of_m`: any accepted seat counts; terminal when `required_count` distinct seat identities have approved.
- `role_scoped`: only seats whose `role` is in `required_roles`.
- `sequential`: seats ordered by `level`; the next required approval must come from the lowest incomplete level. Approving out of order is rejected.

4.3. Authorize the caller. A `session` caller must map to a seat in the eligible set for the current step. Not eligible yet (wrong level) and not eligible at all (wrong role, no seat) both return 403, with distinct audit reasons: `approval_wrong_step` versus `approval_requires_bound_reviewer`.

4.4. Bearer/admin: if `allow_break_glass`, proceed and audit `approvedByBoundReviewer: false` plus `breakGlass: true`. Otherwise treat as a normal caller (no identity, so denied).

4.5. Terminal check. After recording the decision, recompute whether the policy condition is met. Only then set the recommendation to terminal `approved`/`rejected`. A single `rejected` from any eligible approver ends the chain (reject is not accumulative).

## 5. Pilot Gate Under Policies

5.1. `buildPilotGates` reads the active policy and asks: can this policy be satisfied by the currently accepted seats? For `single`, that is one accepted seat (today). For `n_of_m`, at least `required_count` accepted seats. For `role_scoped` / `sequential`, at least one accepted seat per required role/level.

5.2. If the policy cannot be satisfied by present seats, the `reviewer_named` gate stays blocked with a specific label, for example "2 of 3 reviewer seats accepted". This keeps the gate honest: a workspace is pilot-ready only when its declared approval policy is actually staffable.

## 6. API Surface

6.1. `GET /api/approval-policy` returns the active policy (or the synthesized `single` default) plus a staffing summary (accepted seats by role/level).

6.2. `PUT /api/approval-policy` (admin scope) sets the policy. Validates that `required_count` and `required_roles` are internally consistent; supersedes the prior row; audits `approval_policy.updated` with before/after.

6.3. `POST /api/approvals/[recommendationId]` unchanged on the surface. Internally calls `resolveApprovalDecision`. The 403 body carries a machine-readable reason so the UI can explain "waiting on compliance reviewer" versus "not your step yet".

## 7. UI

7.1. Settings surface to define the policy: pick mode, set count or roles, invite/assign seats to roles and levels, see live staffing status.

7.2. On the Approvals view, show the policy state per item: who has approved, who is still required, whose step it is now. One primary action, and it is disabled with a reason when the current caller is not the eligible approver for this step.

## 8. Migration and Backward Compatibility

8.1. Absent policy row equals `single` mode equals slice-3 behavior. Existing workspaces need no action.

8.2. New columns are nullable with safe backfill (`role = 'reviewer'`). No existing approval flow changes until an admin explicitly sets a non-single policy.

8.3. Tests carry forward: the slice-3 suite (`tests/approvals-authz.test.ts`) becomes the `single`-mode case. Add suites for `n_of_m`, `sequential` ordering, `role_scoped`, staffing-based gating, and reject-ends-chain.

## 9. Explicitly Out Of Scope (For Now)

9.1. Cross-workspace or org-hierarchy approvals (approver in a parent org). Revisit only if a pilot's structure demands it.

9.2. Time-based escalation (auto-advance if a reviewer does not act within N hours). Design once a pilot asks; it needs a scheduler hook, not just a policy shape.

9.3. Conditional policies keyed on recommendation risk or amount. Powerful but speculative until a buyer names the rule.

## 10. Build Sequence

10.1. Migration: `approval_policies` table plus nullable `role`/`level`/`team` on `reviewer_seats`; backfill.

10.2. `resolveApprovalDecision` with `single` and one real second mode (the first pilot's actual shape), behind the existing route.

10.3. Policy-aware `buildPilotGates` staffing check.

10.4. `GET`/`PUT /api/approval-policy` plus Settings UI.

10.5. Approvals-view policy state and per-step gating.

Ship 10.1 to 10.3 to make one real pilot policy work end to end before building the general UI in 10.4 and 10.5.

## Source Documents

- `apps/mission-control/db/schema.ts` (`reviewer_seats`, migration 0035)
- `apps/mission-control/app/api/approvals/[recommendationId]/route.ts` (slice-3 enforcement)
- `apps/mission-control/lib/services/workflow-twins.ts` (`buildPilotGates`)
- `apps/mission-control/app/api/reviewer-seat/route.ts`, `.../accept/route.ts`
- `BACKLOG.md` P2 row "Approval policies (multi-level, teams)"
