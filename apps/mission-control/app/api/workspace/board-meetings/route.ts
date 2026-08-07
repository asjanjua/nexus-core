import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

export const runtime = "nodejs";

// GET — list meetings
export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;
  try {
    const profile = await repository.getBoardProfile(auth.ctx.workspaceId);
    if (!profile) return fail("board_not_configured", 404);
    const meetings = await repository.listBoardMeetings(auth.ctx.workspaceId);
    return ok({ generatedAt: new Date().toISOString(), boardId: profile.id, boardType: profile.boardType, meetings });
  } catch (_err) { return fail("board_meetings_failed", 500); }
}

// POST — create meeting
const createSchema = z.object({
  title: z.string().min(1).max(200),
  meetingDate: z.string().min(1),
  location: z.string().max(200).optional().nullable(),
  meetingNumber: z.number().int().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireScope(request, "write:settings");
  if (auth.error) return auth.error;
  try {
    const profile = await repository.getBoardProfile(auth.ctx.workspaceId);
    if (!profile) return fail("board_not_configured", 404);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail("invalid_meeting", 400);
    const boardId = (profile as Record<string, unknown>).id as string;
    const existing = await repository.listBoardMeetings(auth.ctx.workspaceId);
    const meetingNumber = parsed.data.meetingNumber ?? (existing.length > 0 ? existing.reduce((max, m) => Math.max(max, (m as Record<string, unknown>).meetingNumber as number ?? 0), 0) + 1 : 1);
    const meeting = await repository.createBoardMeeting(auth.ctx.workspaceId, boardId, { ...parsed.data, meetingNumber, meetingDate: new Date(parsed.data.meetingDate) });
    return ok(meeting);
  } catch (_err) { return fail("meeting_create_failed", 500); }
}
