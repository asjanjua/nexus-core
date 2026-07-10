/**
 * Quorum Governance Review — executable engine
 *
 * Reviews a board meeting's governed evidence together with its decisions and
 * actions, and produces:
 *   - governanceFindings: board-pack completeness checklist, each requirement
 *     covered or not with cited evidence (source spans, provenance);
 *   - decisionGaps: overdue open decisions, decisions with no follow-through
 *     action, and actions missing an owner or due date or left blocking;
 *   - approvalPacket: what a human must approve before the record is final
 *     (Quorum never signs, files, or finalizes automatically);
 *   - boardPackCaveats: missing-requirement caveats plus the standing Quorum
 *     governance boundaries (no legal authority, human approval, jurisdiction
 *     review) so a pack is never presented as statutory-ready on its own.
 *
 * Pure and deterministic: no I/O, no LLM, callers pass `now`. Only `processed`
 * evidence is cited, and coverage uses trustworthy department-tag matching
 * rather than semantic inference.
 */

import type { Action, Decision, EvidenceRecord } from "@/lib/contracts";
import { extractSourceSpan } from "@/lib/agents/evidence-grid-review";
import type { DDSeverity } from "@/lib/domain/dd-checklist-library";
import { quorumGovernanceBoundaries } from "@/lib/board-governance-workflow";

export type QuorumGovernanceOptions = {
  maxCitationsPerRequirement?: number;
};

type BoardPackRequirement = {
  id: string;
  label: string;
  evidenceTags: string[];
  severity: DDSeverity;
};

// Board-pack completeness checklist. Tags match the `department` label a deal
// or board workspace applies to uploads (same field as ingestion/retrieval).
const BOARD_PACK_REQUIREMENTS: BoardPackRequirement[] = [
  { id: "notice", label: "Meeting notice issued with required lead time", evidenceTags: ["Board Notice", "Notice"], severity: "high" },
  { id: "agenda", label: "Agenda circulated", evidenceTags: ["Agenda", "Board Pack"], severity: "high" },
  { id: "quorum", label: "Quorum and attendance confirmed", evidenceTags: ["Attendance", "Quorum"], severity: "critical" },
  { id: "conflicts", label: "Conflicts of interest disclosed", evidenceTags: ["Conflicts Register", "Conflicts"], severity: "critical" },
  { id: "prior_minutes", label: "Prior minutes tabled for approval", evidenceTags: ["Minutes"], severity: "medium" },
  { id: "resolutions", label: "Resolutions and decisions recorded", evidenceTags: ["Board Resolution", "Resolutions", "Decisions"], severity: "high" },
  { id: "financials", label: "Financials tabled", evidenceTags: ["Management Accounts", "Financial Statements"], severity: "medium" },
];

export type GovernanceCitation = {
  evidenceId: string;
  sourcePath: string;
  sourceSpan: string;
  confidence: number;
  freshnessHours: number;
};

export type GovernanceFinding = {
  requirementId: string;
  label: string;
  severity: DDSeverity;
  covered: boolean;
  citations: GovernanceCitation[];
};

export type DecisionGap = {
  decisionId: string;
  title: string;
  reason: "overdue_open_decision" | "no_follow_through_action" | "action_missing_owner" | "action_missing_due_date" | "open_blocker_action";
  detail: string;
};

export type ApprovalPacketItem = {
  kind: "decision" | "governance_boundary";
  refId: string;
  summary: string;
  requiresHumanApproval: true;
};

export type BoardPackCaveat = {
  source: "missing_requirement" | "governance_boundary";
  refId: string;
  detail: string;
  severity: DDSeverity;
};

export type QuorumGovernanceAuditEvent = {
  type:
    | "native_skill.quorum_governance_review.started"
    | "native_skill.quorum_governance_review.completed";
  payload: Record<string, unknown>;
};

export type QuorumGovernanceResult = {
  reviewId: string;
  governanceFindings: GovernanceFinding[];
  decisionGaps: DecisionGap[];
  approvalPacket: ApprovalPacketItem[];
  boardPackCaveats: BoardPackCaveat[];
  summary: {
    requirements: number;
    covered: number;
    criticalGaps: number;
    decisionGaps: number;
    approvalItems: number;
    recordReady: boolean;
  };
};

const DEFAULTS: Required<QuorumGovernanceOptions> = {
  maxCitationsPerRequirement: 3,
};

function citeRequirement(requirement: BoardPackRequirement, records: EvidenceRecord[], max: number): GovernanceCitation[] {
  const tags = requirement.evidenceTags.map((tag) => tag.toLowerCase());
  return records
    .filter((record) => tags.includes((record.department ?? "").toLowerCase()))
    .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
    .slice(0, max)
    .map((record) => ({
      evidenceId: record.id,
      sourcePath: record.sourcePath,
      sourceSpan: extractSourceSpan(record.text, requirement.label.split(/\s+/).slice(0, 5)),
      confidence: record.extractionConfidence,
      freshnessHours: record.freshnessHours,
    }));
}

export function reviewQuorumGovernance(input: {
  reviewId: string;
  records: EvidenceRecord[];
  decisions: Decision[];
  actions: Action[];
  now: string;
  options?: QuorumGovernanceOptions;
}): QuorumGovernanceResult {
  const opts = { ...DEFAULTS, ...(input.options ?? {}) };
  const governed = input.records.filter((record) => record.ingestionStatus === "processed");
  const nowMs = Date.parse(input.now);

  // --- Governance findings (board-pack completeness) ------------------------
  const governanceFindings: GovernanceFinding[] = BOARD_PACK_REQUIREMENTS.map((requirement) => {
    const citations = citeRequirement(requirement, governed, opts.maxCitationsPerRequirement);
    return {
      requirementId: requirement.id,
      label: requirement.label,
      severity: requirement.severity,
      covered: citations.length > 0,
      citations,
    };
  });

  // --- Decision and action gaps --------------------------------------------
  const decisionGaps: DecisionGap[] = [];
  const actionsByDecision = new Map<string, Action[]>();
  for (const action of input.actions) {
    const list = actionsByDecision.get(action.decisionId) ?? [];
    list.push(action);
    actionsByDecision.set(action.decisionId, list);
  }

  for (const decision of input.decisions) {
    if (decision.status === "open" && decision.deadline && !Number.isNaN(nowMs) && Date.parse(decision.deadline) < nowMs) {
      decisionGaps.push({
        decisionId: decision.id,
        title: decision.title,
        reason: "overdue_open_decision",
        detail: `Open past its deadline (${decision.deadline}).`,
      });
    }
    const linked = actionsByDecision.get(decision.id) ?? [];
    if (decision.status === "decided" && linked.length === 0) {
      decisionGaps.push({
        decisionId: decision.id,
        title: decision.title,
        reason: "no_follow_through_action",
        detail: "Decided but no action captured to carry it out.",
      });
    }
    for (const action of linked) {
      if (!action.owner?.trim()) {
        decisionGaps.push({ decisionId: decision.id, title: decision.title, reason: "action_missing_owner", detail: `Action '${action.actionText}' has no owner.` });
      }
      if (!action.dueDate) {
        decisionGaps.push({ decisionId: decision.id, title: decision.title, reason: "action_missing_due_date", detail: `Action '${action.actionText}' has no due date.` });
      }
      if (action.isBlocker && action.status === "open") {
        decisionGaps.push({ decisionId: decision.id, title: decision.title, reason: "open_blocker_action", detail: `Blocking action '${action.actionText}' is still open.` });
      }
    }
  }

  // --- Approval packet ------------------------------------------------------
  const approvalPacket: ApprovalPacketItem[] = [];
  for (const decision of input.decisions) {
    if (decision.status === "decided") {
      approvalPacket.push({
        kind: "decision",
        refId: decision.id,
        summary: `Decision "${decision.title}" requires chair/board sign-off before the record is final.`,
        requiresHumanApproval: true,
      });
    }
  }
  approvalPacket.push({
    kind: "governance_boundary",
    refId: "human-approval-control",
    summary: "Quorum prepared this pack; a human must approve, sign, and finalize the record. Nothing is finalized automatically.",
    requiresHumanApproval: true,
  });

  // --- Board-pack caveats ---------------------------------------------------
  const boardPackCaveats: BoardPackCaveat[] = [];
  for (const finding of governanceFindings) {
    if (!finding.covered) {
      boardPackCaveats.push({
        source: "missing_requirement",
        refId: finding.requirementId,
        detail: `No evidence tabled for: ${finding.label}.`,
        severity: finding.severity,
      });
    }
  }
  for (const boundary of quorumGovernanceBoundaries) {
    boardPackCaveats.push({
      source: "governance_boundary",
      refId: boundary.id,
      detail: boundary.rule,
      severity: "high",
    });
  }

  const covered = governanceFindings.filter((finding) => finding.covered).length;
  const criticalGaps = governanceFindings.filter((finding) => !finding.covered && finding.severity === "critical").length;
  const recordReady = criticalGaps === 0 && decisionGaps.length === 0;

  return {
    reviewId: input.reviewId,
    governanceFindings,
    decisionGaps,
    approvalPacket,
    boardPackCaveats,
    summary: {
      requirements: governanceFindings.length,
      covered,
      criticalGaps,
      decisionGaps: decisionGaps.length,
      approvalItems: approvalPacket.length,
      recordReady,
    },
  };
}

export function quorumGovernanceAuditEvents(
  input: { reviewId: string; records: EvidenceRecord[]; decisions: Decision[]; actions: Action[] },
  result: QuorumGovernanceResult
): QuorumGovernanceAuditEvent[] {
  return [
    {
      type: "native_skill.quorum_governance_review.started",
      payload: {
        reviewId: input.reviewId,
        candidateRecords: input.records.length,
        decisions: input.decisions.length,
        actions: input.actions.length,
      },
    },
    {
      type: "native_skill.quorum_governance_review.completed",
      payload: { reviewId: input.reviewId, ...result.summary },
    },
  ];
}
