/**
 * Funnel + pilot-lifecycle derivation (P2 operator panel).
 *
 * Two honest views over signals that already exist in the product — no new
 * instrumentation, no fabricated stages:
 *
 *   1. Acquisition funnel — counts from the public readiness audit stream
 *      (`public-readiness` workspace): assessment submitted -> claim emailed ->
 *      claim redeemed.
 *   2. Pilot-stage tracker — the per-workspace lifecycle after signup, each
 *      stage backed by a real signal (selected workflow, evidence, first brief,
 *      review loop, shadow-ROI measurement).
 *
 * Pure functions so the operator API and tests share one source of truth.
 */

export type StageStatus = "done" | "current" | "pending";

/**
 * Funnel visibility policy (decision 2026-07-09, docs/USER_STRATEGY_AND_PIVOTS.md
 * §Decisions): the funnel page is operator-only for now, but visibility is a
 * policy, not a hard gate, so it can be re-opened per-workspace without code
 * change.
 *
 *   - "admin" (default): the whole surface requires an operator identity.
 *   - "workspace": any authenticated user sees their own pilot stages; the
 *     cross-tenant acquisition section stays operator-only in BOTH modes.
 *
 * Operator identity: Clerk user ids listed in NEXUS_OPERATOR_USER_IDS (comma-
 * separated). Note that requireScope cannot express this — Clerk session users
 * carry wildcard scope, so scope checks only constrain bearer tokens.
 */
export type FunnelVisibility = "admin" | "workspace";

export function resolveFunnelVisibility(raw: string | undefined): FunnelVisibility {
  return raw === "workspace" ? "workspace" : "admin";
}

export function isOperatorUser(userId: string, allowlistRaw: string | undefined): boolean {
  if (!allowlistRaw) return false;
  return allowlistRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

export interface FunnelAccess {
  /** Caller may see the page at all. */
  pageAllowed: boolean;
  /** Caller may see the cross-tenant acquisition section. */
  acquisitionAllowed: boolean;
  /** Caller may see their workspace pilot stages. */
  pilotStagesAllowed: boolean;
}

export function resolveFunnelAccess(visibility: FunnelVisibility, operator: boolean): FunnelAccess {
  if (operator) return { pageAllowed: true, acquisitionAllowed: true, pilotStagesAllowed: true };
  if (visibility === "workspace") {
    return { pageAllowed: true, acquisitionAllowed: false, pilotStagesAllowed: true };
  }
  return { pageAllowed: false, acquisitionAllowed: false, pilotStagesAllowed: false };
}

export interface AcquisitionFunnel {
  submitted: number;
  claimsSent: number;
  redeemed: number;
  /** redeemed / submitted, 0 when no submissions. */
  redeemRatePct: number;
}

export interface PilotStage {
  key: string;
  label: string;
  status: StageStatus;
  detail: string;
}

export interface PilotStageInput {
  selectedWorkflow: string | null;
  evidenceCount: number;
  briefCount: number;
  approvalCount: number;
  roiMeasurementCount: number;
}

/** Count the three public-readiness funnel events into an acquisition view. */
export function deriveAcquisitionFunnel(events: Array<{ type: string }>): AcquisitionFunnel {
  let submitted = 0;
  let claimsSent = 0;
  let redeemed = 0;
  for (const event of events) {
    if (event.type === "readiness.assessment_submitted") submitted++;
    else if (event.type === "readiness.claim_email_sent") claimsSent++;
    else if (event.type === "readiness.claim_redeemed") redeemed++;
  }
  const redeemRatePct = submitted > 0 ? Math.round((redeemed / submitted) * 100) : 0;
  return { submitted, claimsSent, redeemed, redeemRatePct };
}

/**
 * Map per-workspace signals onto the five pilot stages. Each stage is "done"
 * when its own signal is satisfied; the first unsatisfied stage is "current"
 * (the operator's next action); everything else is "pending". Stages are
 * evaluated on their own signal, so a later stage can read done while an
 * earlier one is current — that is intentional and honest, not smoothed over.
 */
export function derivePilotStages(input: PilotStageInput): PilotStage[] {
  const signals: Array<{ key: string; label: string; done: boolean; detail: string }> = [
    {
      key: "selected",
      label: "Workflow selected",
      done: Boolean(input.selectedWorkflow),
      detail: input.selectedWorkflow
        ? `First pilot: ${input.selectedWorkflow}`
        : "No workflow chosen as the first pilot yet.",
    },
    {
      key: "evidence",
      label: "Evidence connected",
      done: input.evidenceCount > 0,
      detail: input.evidenceCount > 0
        ? `${input.evidenceCount} governed evidence source(s).`
        : "No evidence uploaded or connected.",
    },
    {
      key: "first_brief",
      label: "First brief generated",
      done: input.briefCount > 0,
      detail: input.briefCount > 0
        ? `${input.briefCount} agent output(s) produced.`
        : "No synthesis or brief generated yet.",
    },
    {
      key: "review_loop",
      label: "Review loop active",
      done: input.approvalCount > 0,
      detail: input.approvalCount > 0
        ? `${input.approvalCount} approval decision(s) recorded.`
        : "No recommendation has been approved or rejected yet.",
    },
    {
      key: "roi",
      label: "Shadow ROI captured",
      done: input.roiMeasurementCount > 0,
      detail: input.roiMeasurementCount > 0
        ? `${input.roiMeasurementCount} shadow-ROI measurement(s).`
        : "No shadow-ROI measurement recorded.",
    },
  ];

  const firstIncomplete = signals.findIndex((s) => !s.done);
  return signals.map((s, i) => ({
    key: s.key,
    label: s.label,
    detail: s.detail,
    status: s.done ? "done" : i === firstIncomplete ? "current" : "pending",
  }));
}
