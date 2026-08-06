/**
 * PATCH /api/rooms/[roomId] — activate or update a room.
 *
 * The caller must hold write:rooms scope (workspace administrator).
 * The Executive Command room cannot be deactivated.
 *
 * See docs/NEXUS_ROOM_PORTFOLIO_ACTIVATION.md for the full policy.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { activateRoomSchema } from "@/lib/contracts";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const auth = await requireScope(request, "write:rooms");
  if (auth.error) return auth.error;

  const { roomId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("invalid_json", 400); }

  const parsed = activateRoomSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "invalid_input", 400);

  const room = await repository.getRoom(auth.ctx.workspaceId, roomId);
  if (!room) return fail("room_not_found", 404);

  // The Executive Command room must remain active.
  // If lifecycleState is explicitly provided, use it; otherwise preserve
  // the room's existing state (a PATCH that only changes the owner should
  // not re-activate an inactive room — reviewed 2026-08-06).
  const willDeactivate = parsed.data.lifecycleState !== undefined
    ? parsed.data.lifecycleState === "inactive"
    : room.lifecycleState === "inactive";

  if (room.template === "executive" && parsed.data.lifecycleState === "inactive") {
    return fail("executive_room_is_mandatory", 400);
  }

  const updated = await repository.activateRoom(auth.ctx.workspaceId, roomId, {
    ...parsed.data,
    lifecycleState: willDeactivate ? "inactive" : "active",
    activatedBy: auth.ctx.userId,
  });

  return ok(updated);
}
