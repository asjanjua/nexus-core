/**
 * GET /api/approval-policy — returns the active policy (or synthesized default)
 * plus a staffing summary (accepted seats by role/level).
 *
 * PUT /api/approval-policy — sets the policy (admin scope), supersedes prior
 * row, audits the change.
 *
 * See docs/APPROVAL_POLICIES_SPEC.md §6.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { updateApprovalPolicySchema } from "@/lib/contracts";
import { isPolicyStaffable } from "@/lib/approval-policy-resolver";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  const policy = await repository.getActiveApprovalPolicy(auth.ctx.workspaceId).catch(() => null);
  const seats = await repository.getAcceptedReviewerSeats(auth.ctx.workspaceId).catch(() => []);

  const seatsForStaffing = seats.map((s) => ({
    id: s.id,
    clerkUserId: s.clerkUserId ?? "",
    role: s.role ?? null,
    level: s.level ?? null,
    team: s.team ?? null,
  }));

  const staffable = isPolicyStaffable(policy, seatsForStaffing);

  // Staffing summary: accepted seats grouped by role, ordered by level.
  const roleBreakdown: Record<string, number> = {};
  for (const s of seats) {
    const key = s.role ?? "unassigned";
    roleBreakdown[key] = (roleBreakdown[key] ?? 0) + 1;
  }

  return ok({
    policy: policy ?? { mode: "single", allowBreakGlass: true },
    isDefault: !policy,
    staffable,
    seats,
    roleBreakdown,
  });
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("invalid_json", 400); }

  const parsed = updateApprovalPolicySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "invalid_input", 400);

  // Validate internal consistency — the Zod schema checks types but not
  // mode-specific requirements. Reviewed 2026-08-06 (adversarial review).
  if (parsed.data.mode === "n_of_m") {
    const count = parsed.data.requiredCount ?? 0;
    if (count < 2) return fail("n_of_m mode requires required_count >= 2", 400);
  }
  if (parsed.data.mode === "role_scoped") {
    if (!parsed.data.requiredRoles || parsed.data.requiredRoles.length === 0) {
      return fail("role_scoped mode requires at least one required role", 400);
    }
  }
  if (parsed.data.mode === "sequential") {
    const count = parsed.data.requiredCount ?? 0;
    if (count < 2) return fail("sequential mode requires required_count >= 2", 400);
  }

  try {
    const updated = await repository.upsertApprovalPolicy(auth.ctx.workspaceId, parsed.data);
    return ok(updated);
  } catch (err) {
    return fail("internal_error", 500);
  }
}
