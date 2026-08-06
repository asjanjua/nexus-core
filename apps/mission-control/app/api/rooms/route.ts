/**
 * GET /api/rooms — list rooms for the current workspace.
 * PATCH /api/rooms/[roomId] — activate or update a room.
 *
 * Every workspace sees the complete curated portfolio from day one.
 * A room is not active until an administrator confirms the owner, evidence
 * scope, agent pack, and human-authority boundary. The Executive Command
 * room is mandatory and created at workspace provision.
 *
 * See docs/NEXUS_ROOM_PORTFOLIO_ACTIVATION.md for the full policy.
 */

import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import {
  ROOM_TEMPLATES,
  activateRoomSchema,
} from "@/lib/contracts";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/rooms
// ---------------------------------------------------------------------------
// Returns all rooms for the workspace. Seeds missing portfolio templates on
// first read so a new workspace sees the full portfolio immediately.

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:dashboard");
  if (auth.error) return auth.error;

  const rooms = await repository.listRooms(auth.ctx.workspaceId);

  // Seed any portfolio templates not yet materialised for this workspace.
  const existing = new Set(rooms.map((r) => r.template));
  const missing = ROOM_TEMPLATES.filter((t) => !existing.has(t));

  if (missing.length > 0) {
    for (const template of missing) {
      await repository.seedRoom(auth.ctx.workspaceId, template);
    }
    const all = await repository.listRooms(auth.ctx.workspaceId);
    return ok(all);
  }

  return ok(rooms);
}

// ---------------------------------------------------------------------------
// PATCH /api/rooms/[roomId]
// ---------------------------------------------------------------------------
// Activate or update a room. The Executive Command room cannot be deactivated.

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
  const willDeactivate = parsed.data.lifecycleState === "inactive";
  if (room.template === "executive" && willDeactivate) {
    return fail("executive_room_is_mandatory", 400);
  }

  const updated = await repository.activateRoom(auth.ctx.workspaceId, roomId, {
    ...parsed.data,
    lifecycleState: willDeactivate ? "inactive" : "active",
    activatedBy: auth.ctx.userId,
  });

  return ok(updated);
}
