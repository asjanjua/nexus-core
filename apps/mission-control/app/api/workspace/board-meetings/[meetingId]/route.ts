/**
 * GET  /api/workspace/board-meetings/[meetingId] — meeting detail
 * PATCH /api/workspace/board-meetings/[meetingId] — update minutes/status
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  minutesStatus: z.enum(["pending", "drafted", "circulated", "approved", "signed"]).optional(),
  agendaStatus: z.enum(["draft", "circulated", "approved"]).optional(),
  quorumMet: z.boolean().optional(),
  attendeesCount: z.number().int().min(1).optional(),
  decisionsCount: z.number().int().min(0).optional(),
  actionItemsCount: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const auth = await requireScope(_request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const { meetingId } = await params;
    const meetings = await repository.listBoardMeetings(auth.ctx.workspaceId);
    const meeting = meetings.find((m) => (m as Record<string, unknown>).id === meetingId);
    if (!meeting) return fail("meeting_not_found", 404);
    return ok(meeting);
  } catch (_err) {
    return fail("meeting_detail_failed", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;

  try {
    const { meetingId } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail("invalid_meeting_update", 400);

    // Update the meeting record via the repository.
    const updated = await repository.updateBoardMeeting(
      auth.ctx.workspaceId,
      meetingId,
      parsed.data,
    );
    if (!updated) return fail("meeting_not_found", 404);

    return ok(updated);
  } catch (_err) {
    return fail("meeting_update_failed", 500);
  }
}
