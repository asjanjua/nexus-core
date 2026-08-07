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

    const meetings = await repository.listBoardMeetings(auth.ctx.workspaceId);

    return ok({
      generatedAt: new Date().toISOString(),
      boardId: profile.id,
      boardType: profile.boardType,
      meetings,
    });
  } catch (_err) {
    return fail("board_meetings_failed", 500);
  }
}
