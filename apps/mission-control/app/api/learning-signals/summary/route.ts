import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

// GET /api/learning-signals/summary — per-agent quality metrics for governance views
export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;

  const summaries = await repository.getLearningSignalSummary(ctx.workspaceId, agentId);

  return ok({ summaries });
}
