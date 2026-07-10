import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const actionType = url.searchParams.get("actionType") ?? undefined;
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "7")));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const outputs = await repository.listAgentOutputs({
    workspaceId: ctx.workspaceId,
    agentId,
    actionType,
    since,
    limit
  });

  return ok({ outputs, total: outputs.length });
}
