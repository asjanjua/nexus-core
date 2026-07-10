import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";

  const output = await repository.rollbackAgentOutput(ctx.workspaceId, id, ctx.userId, reason);
  if (!output) return fail("agent_output_not_found", 404);

  return ok({ output });
}
