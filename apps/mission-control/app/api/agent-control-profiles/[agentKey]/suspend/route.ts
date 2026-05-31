import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentKey: string }> }
) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { agentKey } = await params;
  if (!agentKey) return fail("invalid_agent", 400);

  const suspended = await repository.suspendAgentControlProfile(ctx.workspaceId, agentKey, ctx.userId);
  if (!suspended) return fail("agent_not_found_or_not_active", 404);
  return ok({ suspended: true, agentKey });
}

