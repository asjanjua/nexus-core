/**
 * GET /api/pilot/paperwork?workspaceId=...
 *
 * Generates a pre-filled pilot paperwork pack from the workspace's strategy profile.
 * Returns: SOW fields, onboarding checklist, success scorecard, billing trigger checklist,
 * and a value proof pack — all pre-populated from buyer lane + selected workflow.
 *
 * Requires: read:admin scope.
 */
import { fail, ok } from "@/lib/api";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? auth?.workspaceId ?? DEFAULT_WORKSPACE;

  const [profile, settings, workflows] = await Promise.all([
    repository.getStrategyProfile(workspaceId),
    repository.getWorkspaceSettings(workspaceId),
    repository.listWorkflowTwins(workspaceId).catch(() => []),
  ]);

  if (!profile) {
    return fail("no_strategy_profile", 404);
  }

  const selectedWorkflow = workflows.find((w) => w.name === profile.selectedWorkflow) ?? workflows[0];

  const paperwork = {
    workspaceId,
    workspaceName: settings.name,
    generatedAt: new Date().toISOString(),

    // Pre-filled from strategy profile
    buyerLane: profile.buyerLane,
    sector: profile.sector,
    role: profile.role,
    companySize: profile.companySize,
    priority: profile.priority,
    governancePosture: profile.governancePosture,
    readinessBand: profile.readinessBand,

    // SOW pre-fill
    sow: {
      clientName: settings.name,
      sector: profile.sector ?? "Not specified",
      buyerLane: profile.buyerLane,
      sponsor: {
        name: profile.sponsorName ?? "[Sponsor name]",
        email: profile.sponsorEmail ?? "[Sponsor email]",
      },
      reviewer: {
        name: profile.reviewerName ?? "[Reviewer name]",
        email: profile.reviewerEmail ?? "[Reviewer email]",
      },
      governancePosture: profile.governancePosture,
      selectedWorkflow: profile.selectedWorkflow ?? selectedWorkflow?.name ?? "[Select workflow]",
      pilotDuration: "90 days",
      startDate: "[TBD — set at kickoff]",
    },

    // Onboarding checklist — 5 standard steps with pre-filled context
    onboardingChecklist: [
      { step: 1, title: "Confirm sponsor and reviewer", done: !!(profile.sponsorName && profile.reviewerName), detail: profile.sponsorName ? `${profile.sponsorName} / ${profile.reviewerName}` : null },
      { step: 2, title: "Upload first evidence bundle", done: false, detail: `Upload 5–10 documents relevant to ${profile.selectedWorkflow ?? "your workflow"}` },
      { step: 3, title: "Configure governance boundaries", done: false, detail: `Set sensitivity ceiling (current: ${profile.governancePosture}), output gates, and approval rules` },
      { step: 4, title: "Run first workflow twin", done: false, detail: selectedWorkflow ? `Execute ${selectedWorkflow.name} with evidence bundle` : null },
      { step: 5, title: "Review first shadow ROI measurement", done: false, detail: "Compare manual vs Nexus-assisted execution after first cycle" },
    ],

    // Success scorecard — 7 outcomes with buyer-lane weighting
    scorecard: {
      outcomes: [
        { id: "time_to_decision", label: "Time to decision", weight: profile.priority === "critical" ? 25 : 15, day30: null, day60: null, day90: null },
        { id: "evidence_quality", label: "Evidence quality score", weight: 15, day30: null, day60: null, day90: null },
        { id: "execution_speed", label: "Execution speed (actions/week)", weight: 15, day30: null, day60: null, day90: null },
        { id: "risk_visibility", label: "Risk visibility (risks flagged)", weight: 15, day30: null, day60: null, day90: null },
        { id: "sponsor_satisfaction", label: "Sponsor satisfaction (1–10)", weight: 10, day30: null, day60: null, day90: null },
        { id: "workflow_coverage", label: "Workflow step coverage", weight: 10, day30: null, day60: null, day90: null },
        { id: "shadow_roi", label: "Shadow ROI (hours saved)", weight: 10, day30: null, day60: null, day90: null },
      ],
      signOff: {
        sponsor: profile.sponsorName ?? "[Sponsor]",
        reviewer: profile.reviewerName ?? "[Reviewer]",
        date: "[Date]",
      },
    },

    // Billing trigger checklist
    billingTriggers: [
      { trigger: "First workflow twin run completed", status: "pending" },
      { trigger: "Shadow ROI measurement reviewed (Day 30)", status: "pending" },
      { trigger: "Sponsor satisfaction ≥ 7/10 (Day 30)", status: "pending" },
      { trigger: "Pilot continuation decision (Day 60)", status: "pending" },
      { trigger: "Convert to paid plan (Day 90)", status: "pending" },
    ],

    // Value proof pack — template for pilot review meetings
    valueProof: {
      beforeState: "[Describe current manual process for this workflow]",
      nexusApproach: `NexusAI governs ${profile.selectedWorkflow ?? "this workflow"} with evidence-backed briefs, automated risk detection, and human-approved recommendations.`,
      shadowRoiTarget: "[Hours saved per week × exec cost/hr]",
      qualitativeSignals: [
        "[Signal 1: e.g. Faster board pack preparation]",
        "[Signal 2: e.g. Earlier risk detection]",
        "[Signal 3: e.g. Better decision traceability]",
      ],
      nextReviewDate: "[Day 30 review date]",
    },
  };

  return ok(paperwork);
}
