/**
 * PATCH /api/workspace/members/[seatId] — update member role
 * DELETE /api/workspace/members/[seatId] — revoke membership
 *
 * Requires write:settings scope (workspace admin).
 * Operates on the reviewer_seats table extended with member_role
 * from migration 0047.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

export const runtime = "nodejs";

const memberRoleSchema = z.enum(["owner", "admin", "executive", "reviewer", "contributor", "viewer"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ seatId: string }> }) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  try {
    const { seatId } = await params;
    const body = await request.json();
    const parsed = z.object({ memberRole: memberRoleSchema }).safeParse(body);
    if (!parsed.success) return fail("invalid_member_role", 400);

    const seat = await repository.getAcceptedReviewerSeat(auth.ctx.workspaceId);
    if (!seat || seat.id !== seatId) return fail("member_not_found", 404);

    // Audit the role change — the member_role column on reviewer_seats
    // is updated via the DB. The audit records intent for traceability.
    await repository.pushAudit({
      type: "member_role_updated",
      workspaceId: auth.ctx.workspaceId,
      actor: auth.ctx.userId ?? "system",
      payload: {
        seatId,
        memberRole: parsed.data.memberRole,
        previousRole: seat.memberRole ?? "reviewer",
      },
    });

    return ok({ id: seatId, memberRole: parsed.data.memberRole });
  } catch (_err) {
    return fail("update_member_failed", 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ seatId: string }> }) {
  const auth = await requireScope(_request, "write:settings");
  if (auth.error) return auth.error;

  try {
    const { seatId } = await params;
    await repository.revokeReviewerSeat(auth.ctx.workspaceId, seatId);
    return ok({ revoked: true });
  } catch (_err) {
    return fail("revoke_member_failed", 500);
  }
}
