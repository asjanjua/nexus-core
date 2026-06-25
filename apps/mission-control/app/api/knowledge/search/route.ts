import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { summarizeSearchResults } from "@/lib/services/knowledge";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
  const results = await repository.searchKnowledge(ctx.workspaceId, q, limit);
  return ok({ results, summary: summarizeSearchResults(results), total: results.length });
}
