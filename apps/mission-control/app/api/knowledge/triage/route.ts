import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { triageKnowledgeInbox } from "@/lib/services/knowledge";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const result = await triageKnowledgeInbox(ctx.workspaceId, ctx.userId);
  return ok(result);
}
