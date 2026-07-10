import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;
  const runs = await repository.listEvalRuns(ctx.workspaceId, 10);
  return ok({ runs });
}
