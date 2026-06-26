import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { parseKnowledgeFilterParams } from "@/lib/knowledge/filter-params";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const url = new URL(request.url);
  const filters = parseKnowledgeFilterParams(url.searchParams);
  const graph = await repository.getKnowledgeGraph(ctx.workspaceId, filters);
  return ok(graph);
}
