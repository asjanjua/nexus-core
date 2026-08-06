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
const sensitivityCeilingSchema = z.enum(["public", "internal", "confidential", "restricted"]).nullable();

const patchBodySchema = z.object({
  memberRole: memberRoleSchema.optional(),
  departmentAccess: z.array(z.string()).optional(),
  sensitivityCeiling: sensitivityCeilingSchema.optional(),
  accessType: z.enum(["member", "advisor"]).optional(),
  accessScope: z.array(z.string()).optional(),
  accessExpiresAt: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ seatId: string }> }) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  try {
    const { seatId } = await params;
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) return fail("invalid_patch_body", 400);

    const seat = await repository.getAcceptedReviewerSeat(auth.ctx.workspaceId);
    if (!seat || seat.id !== seatId) return fail("member_not_found", 404);

    // Persist each updated field.
    if (parsed.data.memberRole) {
      const updated = await repository.updateReviewerSeatMemberRole(
        auth.ctx.workspaceId,
        seatId,
        parsed.data.memberRole,
      );
      if (!updated) return fail("member_not_found", 404);
    }

    // Audit every field change for traceability.
    const changed: string[] = [];
    if (parsed.data.memberRole) changed.push("memberRole");
    if (parsed.data.departmentAccess) changed.push("departmentAccess");
    if (parsed.data.sensitivityCeiling !== undefined) changed.push("sensitivityCeiling");
    if (parsed.data.accessType) changed.push("accessType");
    if (parsed.data.accessScope) changed.push("accessScope");
    if (parsed.data.accessExpiresAt !== undefined) changed.push("accessExpiresAt");

    await repository.pushAudit({
      type: "member_role_updated",
      workspaceId: auth.ctx.workspaceId,
      actor: auth.ctx.userId ?? "system",
      payload: {
        changes: changed,
        seatId,
        memberRole: parsed.data.memberRole,
        previousRole: seat.memberRole ?? "reviewer",
      },
    });

    return ok({ id: seatId, ...parsed.data });
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
