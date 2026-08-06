import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { generateDailyBrief } from "@/lib/daily-brief";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const notes = await repository.listKnowledgeNotes(auth.ctx.workspaceId, { limit: 500 });
    const brief = generateDailyBrief(auth.ctx.workspaceId, notes);
    return ok(brief);
  } catch (_err) {
    return fail("brief_failed", 500);
  }
}
