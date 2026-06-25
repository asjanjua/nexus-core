import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const graph = await repository.getKnowledgeGraph(ctx.workspaceId);
  return ok(graph);
}
