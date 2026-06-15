import type { WorkflowTwin, WorkflowTwinRunInput, WorkspaceProfile } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

type WorkflowCandidate = {
  type: string;
  label: string;
  score: number;
  frequency: number;
  pain: number;
  dataReadiness: number;
  risk: number;
  seniorJudgment: number;
  reusability: number;
  monetization: number;
  speedBenefit: number;
  reason: string;
  deferredBecause: string | null;
  recommended: boolean;
};

function sectorBoost(profile: WorkspaceProfile | null, candidateType: string): number {
  const sector = profile?.sector?.toLowerCase() ?? "";
  if (!sector) return 0;
  if (candidateType === "regulatory_response" && /(bank|financ|health|insurance|regulated|public)/.test(sector)) return 8;
  if (candidateType === "agreement_review" && /(services|consult|legal|agency|professional)/.test(sector)) return 5;
  if (candidateType === "ops_review" && /(manufact|logistics|retail|operations|supply)/.test(sector)) return 7;
  if (candidateType === "proposal_sow" && /(consult|agency|services|professional|software)/.test(sector)) return 7;
  return 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildWorkflowCandidates(input: {
  openDecisionCount: number;
  openActionCount: number;
  blockerCount: number;
  recommendationCount: number;
  evidenceCoverage: number;
  profile: WorkspaceProfile | null;
}): WorkflowCandidate[] {
  const dataReadiness = Math.min(100, 45 + input.evidenceCoverage * 8);
  const decisionActivity = Math.min(100, 35 + input.openDecisionCount * 14 + input.openActionCount * 5);
  const opsPain = Math.min(100, 40 + input.blockerCount * 18 + input.openActionCount * 4);
  const recSignal = Math.min(100, 35 + input.recommendationCount * 8);

  const raw = [
    {
      type: "decision_action",
      label: "Decision & Action Twin",
      frequency: 85,
      pain: Math.max(70, decisionActivity),
      dataReadiness,
      risk: 35,
      seniorJudgment: 88,
      reusability: 92,
      monetization: 76,
      speedBenefit: 82,
      reason: "Broadest cross-industry workflow: converts meetings, briefs, and evidence into decisions, owners, risks, blockers, and next actions.",
      deferredBecause: null
    },
    {
      type: "ops_review",
      label: "Ops Review Twin",
      frequency: 78,
      pain: opsPain,
      dataReadiness: Math.max(55, dataReadiness - 5),
      risk: 42,
      seniorJudgment: 74,
      reusability: 84,
      monetization: 70,
      speedBenefit: 76,
      reason: "Best when leadership wants a weekly operating cadence across blockers, overdue owners, KPIs, and follow-up actions.",
      deferredBecause: null
    },
    {
      type: "proposal_sow",
      label: "Proposal / SOW Twin",
      frequency: 58,
      pain: Math.max(55, recSignal),
      dataReadiness: Math.max(45, dataReadiness - 15),
      risk: 52,
      seniorJudgment: 70,
      reusability: 76,
      monetization: 84,
      speedBenefit: 74,
      reason: "Commercially strong for services firms, but should follow once evidence capture and approval queues are trusted.",
      deferredBecause: "Deferred until approved examples, pricing rules, and contract boundaries are available."
    },
    {
      type: "regulatory_response",
      label: "Regulatory Response Twin",
      frequency: 48,
      pain: 76,
      dataReadiness: Math.max(40, dataReadiness - 20),
      risk: 82,
      seniorJudgment: 86,
      reusability: 68,
      monetization: 88,
      speedBenefit: 66,
      reason: "High value for regulated clients, but it has heavier legal, audit, and sign-off requirements than a universal first pilot.",
      deferredBecause: "Deferred until governance outputs and evidence provenance pass UAT."
    },
    {
      type: "agreement_review",
      label: "Agreement Review Twin",
      frequency: 54,
      pain: 70,
      dataReadiness: Math.max(42, dataReadiness - 18),
      risk: 74,
      seniorJudgment: 82,
      reusability: 72,
      monetization: 82,
      speedBenefit: 68,
      reason: "Useful for legal/commercial workflows, but contract review needs stricter redlines, clause policy, and explicit counsel approval.",
      deferredBecause: "Deferred because V1 should not imply autonomous legal judgment."
    },
    {
      type: "risk_review",
      label: "Risk Review Twin",
      frequency: 62,
      pain: 74,
      dataReadiness: Math.max(50, dataReadiness - 10),
      risk: 68,
      seniorJudgment: 86,
      reusability: 78,
      monetization: 78,
      speedBenefit: 70,
      reason: "Strong second or third pilot layer once the first workflow is generating approved risk/action evidence.",
      deferredBecause: "Deferred until the first twin produces enough reviewed outcomes for calibration."
    }
  ];

  const scored = raw.map((candidate) => {
    const score = clampScore(
      candidate.frequency * 0.13 +
      candidate.pain * 0.18 +
      candidate.dataReadiness * 0.22 +
      (100 - candidate.risk) * 0.1 +
      candidate.seniorJudgment * 0.11 +
      candidate.reusability * 0.1 +
      candidate.monetization * 0.08 +
      candidate.speedBenefit * 0.08 +
      sectorBoost(input.profile, candidate.type)
    );
    return { ...candidate, score, recommended: false };
  }).sort((a, b) => b.score - a.score);

  return scored.map((candidate, idx) => ({ ...candidate, recommended: idx === 0 }));
}

export async function buildWorkflowTwinRunInput(
  twin: WorkflowTwin,
  workspaceId: string
): Promise<WorkflowTwinRunInput> {
  const [decisions, actions, recommendations, profile] = await Promise.all([
    repository.listDecisions(workspaceId),
    repository.listActions(workspaceId),
    repository.getRecommendations(workspaceId),
    repository.getWorkspaceProfile(workspaceId)
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
    const candidates = buildWorkflowCandidates({
      openDecisionCount: openDecisions.length,
      openActionCount: actions.filter((action) => action.status === "open").length,
      blockerCount: blockers.length,
      recommendationCount: recommendations.length,
      evidenceCoverage: evidenceRefs.length,
      profile
    });
    const recommended = candidates.find((candidate) => candidate.recommended) ?? candidates[0];
    return {
      evidenceRefs,
      generatedOutputRefs,
      confidence: evidenceRefs.length ? 0.72 : 0.52,
      status: "generated",
      summary: recommended
        ? `Workflow scorer recommends starting with ${recommended.label} (${recommended.score}/100) based on data readiness, pain, risk, and expected speed benefit.`
        : "Workflow scorer baseline generated from current decisions, actions, recommendations, and evidence coverage.",
      payload: {
        candidates,
        recommended,
        scoringWeights: {
          dataReadiness: "22%",
          pain: "18%",
          frequency: "13%",
          seniorJudgment: "11%",
          inverseRisk: "10%",
          reusability: "10%",
          monetization: "8%",
          speedBenefit: "8%"
        },
        shadowPlan: {
          method: "Run the chosen workflow manually once and through Nexus once, then compare minutes, rework, evidence coverage, and approval quality.",
          firstMeasurement: recommended?.label ?? "Chosen workflow twin",
          target: "Show a credible 30-50% reduction in preparation time before making commercial ROI claims."
        },
        metrics: {
          openDecisions: openDecisions.length,
          openActions: actions.filter((action) => action.status === "open").length,
          blockers: blockers.length,
          recommendations: recommendations.length,
          evidenceCoverage: evidenceRefs.length,
          sector: profile?.sector ?? "unknown",
          companyStage: profile?.companyStage ?? "unknown"
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
