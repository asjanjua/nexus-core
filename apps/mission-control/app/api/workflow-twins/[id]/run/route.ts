import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildWorkflowTwinRunInput } from "@/lib/services/workflow-twins";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "read:workflows");
  if (error) return error;

  const { id } = await params;
  const runs = await repository.listWorkflowTwinRuns(ctx.workspaceId, id);
  return ok({ runs, total: runs.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write:workflows");
  if (error) return error;

  const { id } = await params;
  const twin = await repository.getWorkflowTwin(ctx.workspaceId, id);
  if (!twin) return fail("workflow_twin_not_found", 404);
  if (twin.status === "archived" || twin.status === "paused") return fail("workflow_twin_not_active", 409);

  const input = await buildWorkflowTwinRunInput(twin, ctx.workspaceId);
  const run = await repository.createWorkflowTwinRun(ctx.workspaceId, twin, input, ctx.userId);
  return ok({ run }, 201);
}
