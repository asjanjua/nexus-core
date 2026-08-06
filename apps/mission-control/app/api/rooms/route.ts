/**
 * GET /api/rooms — list rooms for the current workspace.
 *
 * Every workspace sees the complete curated portfolio from day one.
 * A room is not active until an administrator confirms the owner, evidence
 * scope, agent pack, and human-authority boundary. The Executive Command
 * room is mandatory and created at workspace provision.
 *
 * Seeds missing portfolio templates on first read so a new workspace
 * sees the full portfolio immediately without a separate seed step.
 *
 * See docs/NEXUS_ROOM_PORTFOLIO_ACTIVATION.md for the full policy.
 */

import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ROOM_TEMPLATES } from "@/lib/contracts";

export const runtime = "nodejs";

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
