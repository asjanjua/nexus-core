/**
 * GET  /api/workspace/board-profile
 * PATCH /api/workspace/board-profile
 *
 * Board governance profile for the Quorum product line.
 * Single board per workspace (unique index).
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const profile = await repository.getBoardProfile(auth.ctx.workspaceId);
    if (!profile) return fail("board_not_configured", 404);
    return ok(profile);
  } catch (_err) {
    return fail("board_profile_failed", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const profile = await repository.upsertBoardProfile(auth.ctx.workspaceId, {
      boardType: body.boardType,
      jurisdiction: body.jurisdiction,
      meetingSchedule: body.meetingSchedule,
      quorumRequirement: body.quorumRequirement,
      noticePeriodDays: body.noticePeriodDays,
      chairpersonName: body.chairpersonName,
      secretaryName: body.secretaryName,
      nextMeetingAt: body.nextMeetingAt,
    });
    return ok(profile);
  } catch (_err) {
    return fail("board_profile_update_failed", 500);
  }
}
