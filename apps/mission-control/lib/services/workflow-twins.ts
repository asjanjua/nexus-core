import type { WorkflowTwin, WorkflowTwinRunInput } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function buildWorkflowTwinRunInput(
  twin: WorkflowTwin,
  workspaceId: string
): Promise<WorkflowTwinRunInput> {
  const [decisions, actions, recommendations] = await Promise.all([
    repository.listDecisions(workspaceId),
    repository.listActions(workspaceId),
    repository.getRecommendations(workspaceId)
  ]);

  const openDecisions = decisions.filter((decision) => decision.status === "open");
  const blockers = actions.filter((action) => action.isBlocker && action.status === "open");
  const overdue = actions.filter((action) =>
    action.status === "open" &&
    action.dueDate &&
    new Date(action.dueDate).getTime() < Date.now()
  );
  const evidenceRefs = unique([
    ...decisions.flatMap((decision) => decision.evidenceRefs ?? []),
    ...recommendations.flatMap((recommendation) => recommendation.evidenceRefs ?? [])
  ]).slice(0, 40);
  const generatedOutputRefs = unique(decisions.map((decision) => decision.sourceOutputId ?? "")).slice(0, 20);

  if (twin.type === "workflow_scorer") {
    return {
      evidenceRefs,
      generatedOutputRefs,
      confidence: evidenceRefs.length ? 0.72 : 0.52,
      status: "generated",
      summary: "Workflow scorer baseline generated from current decisions, actions, recommendations, and evidence coverage.",
      payload: {
        candidates: [
          { type: "decision_action", label: "Decision & Action Twin", score: 84, reason: "Already has decisions/actions substrate and broad cross-industry fit." },
          { type: "ops_review", label: "Ops Review Twin", score: 78, reason: "Recurring cadence, blocker tracking, and owner follow-up are visible in current data." },
          { type: "risk_review", label: "Risk Review Twin", score: 68, reason: "Valuable when risk evidence volume increases." },
          { type: "customer_revenue", label: "Customer / Revenue Review Twin", score: 62, reason: "Needs stronger connector or pipeline evidence." },
          { type: "knowledge_memory", label: "Knowledge / Memory Review Twin", score: 58, reason: "Entity substrate exists but graph UI is not yet built." }
        ],
        metrics: {
          openDecisions: openDecisions.length,
          openActions: actions.filter((action) => action.status === "open").length,
          evidenceCoverage: evidenceRefs.length
        }
      }
    };
  }

  if (twin.type === "ops_review") {
    return {
      evidenceRefs,
      generatedOutputRefs,
      confidence: blockers.length || overdue.length ? 0.76 : 0.62,
      status: "generated",
      summary: `Ops review found ${blockers.length} blocker(s), ${overdue.length} overdue action(s), and ${openDecisions.length} open decision(s).`,
      payload: {
        blockers,
        overdueActions: overdue,
        openDecisions,
        openRecommendations: recommendations.filter((recommendation) => recommendation.status !== "approved")
      }
    };
  }

  return {
    evidenceRefs,
    generatedOutputRefs,
    confidence: evidenceRefs.length ? 0.74 : 0.55,
    status: "generated",
    summary: `Decision & Action run captured ${openDecisions.length} open decision(s), ${actions.filter((action) => action.status === "open").length} open action(s), and ${blockers.length} blocker(s).`,
    payload: {
      openDecisions,
      openActions: actions.filter((action) => action.status === "open"),
      blockers,
      recommendations: recommendations.filter((recommendation) => recommendation.status !== "rejected")
    }
  };
}
