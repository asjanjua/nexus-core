import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const backcastRequestSchema = z.object({
  targetState: z.string().min(10).max(2000),
  functionName: z.string().min(1).max(120).optional(),
  timeHorizon: z.string().min(2).max(80).default("6 weeks")
});

function buildBackcast(input: {
  twinType: string;
  functionName: string;
  targetState: string;
  timeHorizon: string;
}) {
  const createdAt = new Date().toISOString();
  const isOps = input.twinType === "ops_review";
  const isScorer = input.twinType === "workflow_scorer";
  return {
    functionName: input.functionName,
    targetState: input.targetState,
    timeHorizon: input.timeHorizon,
    pilotScope: isScorer
      ? "Use Nexus to score candidate workflows, select one pilot lane, and define evidence requirements before execution."
      : isOps
        ? "Run one weekly operating review loop covering blockers, owner follow-up, KPI signals, and department status."
        : "Run one decision/action loop from evidence intake through decision capture, owner assignment, review, and approval.",
    milestones: [
      `Week 1: confirm ${input.functionName} outcome definition, owners, and decision boundaries.`,
      "Week 2: ingest approved source material and run the first shadow workflow.",
      "Week 3-4: compare Nexus output against manual work, capture edits/rejections, and tighten policy guardrails.",
      `Final week: produce a sponsor-ready pack showing decisions, actions, risks, evidence coverage, and time saved.`
    ],
    requiredEvidence: [
      "At least one recent meeting note, status report, or executive brief.",
      "Approved source documents with provenance, timestamps, and sensitivity labels.",
      "A manual baseline example for comparison.",
      "Named owner or sponsor for approving outputs."
    ],
    successMetrics: [
      "Every proposed decision/action has at least one evidence reference.",
      "No restricted or unprovenanced source appears in generated outputs.",
      "At least one shadow ROI measurement compares manual and Nexus preparation time.",
      "Sponsor confirms the workflow reduced time-to-understand or time-to-follow-up."
    ],
    approvalBoundaries: [
      "Nexus may draft, score, summarize, and propose.",
      "Humans approve before anything becomes canonical or externally shareable.",
      "No contract, HR, legal, finance, or source-system writeback occurs in this pilot lane."
    ],
    createdAt
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write:workflows");
  if (error) return error;

  const { id } = await params;
  const twin = await repository.getWorkflowTwin(ctx.workspaceId, id);
  if (!twin) return fail("workflow_twin_not_found", 404);

  const parsed = backcastRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const backcast = buildBackcast({
    twinType: twin.type,
    functionName: parsed.data.functionName ?? twin.name,
    targetState: parsed.data.targetState,
    timeHorizon: parsed.data.timeHorizon
  });

  const updated = await repository.updateWorkflowTwinConfig(
    ctx.workspaceId,
    id,
    { backcast },
    ctx.userId
  );
  if (!updated) return fail("workflow_twin_not_found", 404);

  return ok({ twin: updated, backcast });
}
