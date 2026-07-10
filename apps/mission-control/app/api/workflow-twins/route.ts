import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { workflowTwinInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workflows");
  if (error) return error;

  const twins = await repository.listWorkflowTwins(ctx.workspaceId);
  return ok({ twins, total: twins.length });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:workflows");
  if (error) return error;

  const parsed = workflowTwinInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const twin = await repository.createWorkflowTwin(ctx.workspaceId, parsed.data, ctx.userId);
  return ok({ twin }, 201);
}
