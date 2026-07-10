import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ role: string }> }
) {
  const { ctx, error } = await requireScope(_request, "read:dashboard");
  if (error) return error;

  const { role } = await params;

  // Get strategy profile to find selected workflow
  const profile = await repository.getStrategyProfile(ctx.workspaceId);
  if (!profile?.selectedWorkflow) {
    return ok({ questions: [], source: null });
  }

  // Find the workflow twin with the selected name
  const twins = await repository.listWorkflowTwins(ctx.workspaceId);
  const twin = twins.find((t) => t.name === profile.selectedWorkflow);
  if (!twin?.config?.backcast) {
    return ok({ questions: [], source: twin?.name ?? null });
  }

  const bc = twin.config.backcast as {
    pilotScope?: string;
    milestones?: string[];
    successMetrics?: string[];
    requiredEvidence?: string[];
    approvalBoundaries?: string[];
  };

  // Build role-specific suggested questions from backcast data
  const questions: string[] = [];

  if (bc.milestones?.length) {
    questions.push(`${bc.milestones[0]} What's the first step I should take now?`);
    questions.push(`Based on the ${role} pilot scope: ${(bc.pilotScope ?? "").slice(0, 80)}... What needs executive attention?`);
  }

  if (bc.successMetrics?.length) {
    questions.push(`${bc.successMetrics[0]} — how are we tracking against this?`);
    questions.push(`What evidence do we have that the ${role} workflow is on track?`);
  }

  if (bc.requiredEvidence?.length) {
    questions.push(`Have we ingested all required evidence? ${bc.requiredEvidence[0]}`);
  }

  // Add a general question
  questions.push(`What risks or blockers should the ${role} review this week?`);

  return ok({
    questions,
    source: twin.name,
    pilotScope: bc.pilotScope ?? null,
  });
}
