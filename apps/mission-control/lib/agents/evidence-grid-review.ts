/**
 * Evidence Grid Review — executable engine
 *
 * Turns a pool of governed evidence records plus a review spec into a
 * reviewer-facing grid: each review dimension is cited back to source spans
 * with provenance and confidence, weak or blocked cells are flagged, gaps are
 * written up as missing-evidence notes, and anything a machine must not clear
 * on its own is escalated to a human reviewer.
 *
 * This module is pure and deterministic. It does no I/O, no LLM calls, and
 * no wall-clock reads (callers pass `now`), so it is fully unit-testable and
 * safe to run inside the approval-gated native skill runtime. Repository
 * loading and audit emission live in the runner (see runEvidenceGridReview).
 */

import type { EvidenceRecord } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EvidenceGridDimension = {
  /** Stable id, e.g. "revenue_actuals". */
  id: string;
  /** Human label for the review row. */
  label: string;
  /** What evidence a reviewer expects to see for this dimension. */
  requirement: string;
  /** Terms used to match evidence text to this dimension (case-insensitive). */
  keywords: string[];
  /** If true, an unsupported or blocked cell must escalate to a reviewer. */
  required: boolean;
};

export type EvidenceGridReviewInput = {
  reviewId: string;
  dimensions: EvidenceGridDimension[];
  records: EvidenceRecord[];
  /** ISO timestamp used as the review clock (deterministic freshness). */
  now: string;
  options?: EvidenceGridReviewOptions;
};

export type EvidenceGridReviewOptions = {
  /** Minimum extraction confidence for a citation to count as strong. */
  confidenceThreshold?: number;
  /** Evidence older than this many hours is flagged stale. */
  freshnessMaxHours?: number;
  /** Max citations retained per dimension (highest confidence first). */
  maxCitationsPerDimension?: number;
};

export type EvidenceCitation = {
  evidenceId: string;
  sourcePath: string;
  sourceType: EvidenceRecord["sourceType"];
  /** Excerpt of the source text around the matched terms. */
  sourceSpan: string;
  confidence: number;
  freshnessHours: number;
  sensitivity: EvidenceRecord["sensitivity"];
  governed: boolean;
};

export type EvidenceGridCellStatus = "supported" | "weak" | "unsupported" | "blocked";

export type EvidenceGridRow = {
  dimensionId: string;
  label: string;
  required: boolean;
  status: EvidenceGridCellStatus;
  /** Highest confidence across governed citations (0 when none). */
  coverageConfidence: number;
  citations: EvidenceCitation[];
};

export type EvidenceIssueReason =
  | "low_confidence"
  | "stale_evidence"
  | "unverified_provenance"
  | "ungoverned_status"
  | "restricted_sensitivity";

export type EvidenceIssueFlag = {
  dimensionId: string;
  evidenceId: string;
  reason: EvidenceIssueReason;
  detail: string;
};

export type MissingEvidenceNote = {
  dimensionId: string;
  label: string;
  required: boolean;
  requirement: string;
  reason: "no_match" | "only_ungoverned" | "only_restricted";
};

export type EscalationSeverity = "high" | "medium" | "low";

export type EscalationReason =
  | "required_dimension_unsupported"
  | "required_dimension_weak"
  | "blocked_evidence"
  | "sensitive_content";

export type ReviewerEscalation = {
  severity: EscalationSeverity;
  reason: EscalationReason;
  dimensionId: string;
  evidenceId?: string;
  recommendedReviewer: string;
  detail: string;
};

export type EvidenceGridAuditEvent = {
  type:
    | "native_skill.evidence_grid_review.started"
    | "native_skill.evidence_grid_review.completed";
  payload: Record<string, unknown>;
};

export type EvidenceGridReviewResult = {
  reviewId: string;
  grid: EvidenceGridRow[];
  issueFlags: EvidenceIssueFlag[];
  missingEvidence: MissingEvidenceNote[];
  reviewerEscalations: ReviewerEscalation[];
  summary: {
    dimensions: number;
    supported: number;
    weak: number;
    unsupported: number;
    blocked: number;
    issueCount: number;
    escalationCount: number;
    approvalRequired: boolean;
  };
};

// ---------------------------------------------------------------------------
// Defaults + sensitive-content triggers
// ---------------------------------------------------------------------------

const DEFAULTS: Required<EvidenceGridReviewOptions> = {
  confidenceThreshold: 0.6,
  freshnessMaxHours: 168, // 7 days
  maxCitationsPerDimension: 3,
};

/**
 * Content that a reviewer with the right qualification must clear before the
 * grid is relied on. Mirrors the output-gate reasons but scans evidence text,
 * so a legal or regulatory statement in a source never passes silently.
 */
const SENSITIVE_TRIGGERS: Array<{ pattern: RegExp; reviewer: string; detail: string }> = [
  { pattern: /\b(legal opinion|legally binding|liability|indemnity|breach of contract|governing law)\b/i, reviewer: "legal_counsel", detail: "legal_interpretation" },
  { pattern: /\b(regulator|regulatory|filing|supervisory|statement of compliance)\b/i, reviewer: "compliance_officer", detail: "regulatory_commitment" },
  { pattern: /\b(data residency|data localisation|data localization|personal data|PII|GDPR|consent)\b/i, reviewer: "data_protection_officer", detail: "data_protection_statement" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a short quotable span from source text, preferring the first
 * sentence that mentions one of the keywords. Shared with the document
 * integrity engine so both skills quote sources the same way.
 */
export function extractSourceSpan(text: string, keywords: string[]): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const hit = sentences.find((sentence) => {
    const hay = sentence.toLowerCase();
    return lowerKeywords.some((keyword) => hay.includes(keyword));
  });
  const span = (hit ?? sentences[0] ?? text).trim();
  return span.length > 280 ? `${span.slice(0, 277)}...` : span;
}

function matchesDimension(record: EvidenceRecord, keywords: string[]): boolean {
  const hay = record.text.toLowerCase();
  return keywords.some((keyword) => hay.includes(keyword.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function reviewEvidenceGrid(input: EvidenceGridReviewInput): EvidenceGridReviewResult {
  const opts = { ...DEFAULTS, ...(input.options ?? {}) };
  const grid: EvidenceGridRow[] = [];
  const issueFlags: EvidenceIssueFlag[] = [];
  const missingEvidence: MissingEvidenceNote[] = [];
  const reviewerEscalations: ReviewerEscalation[] = [];

  for (const dimension of input.dimensions) {
    const matched = input.records.filter((record) => matchesDimension(record, dimension.keywords));

    // Collect issue flags and split governed vs. non-governed matches.
    const governedCitations: EvidenceCitation[] = [];
    let sawRestricted = false;
    let sawUngoverned = false;

    for (const record of matched) {
      const governed = record.ingestionStatus === "processed";

      if (record.sensitivity === "restricted") {
        sawRestricted = true;
        issueFlags.push({
          dimensionId: dimension.id,
          evidenceId: record.id,
          reason: "restricted_sensitivity",
          detail: "Restricted evidence cannot be cited into a review grid without clearance.",
        });
        continue; // never cite restricted material
      }

      if (!governed) {
        sawUngoverned = true;
        issueFlags.push({
          dimensionId: dimension.id,
          evidenceId: record.id,
          reason: "ungoverned_status",
          detail: `Evidence is '${record.ingestionStatus}', not cleared for citation.`,
        });
        continue; // only governed (processed) evidence may be cited
      }

      if (record.extractionConfidence < opts.confidenceThreshold) {
        issueFlags.push({
          dimensionId: dimension.id,
          evidenceId: record.id,
          reason: "low_confidence",
          detail: `Confidence ${Math.round(record.extractionConfidence * 100)}% is below the ${Math.round(opts.confidenceThreshold * 100)}% threshold.`,
        });
      }

      if (record.freshnessHours > opts.freshnessMaxHours) {
        issueFlags.push({
          dimensionId: dimension.id,
          evidenceId: record.id,
          reason: "stale_evidence",
          detail: `Evidence is ${record.freshnessHours}h old, beyond the ${opts.freshnessMaxHours}h window.`,
        });
      }

      if (!record.sourceUri) {
        issueFlags.push({
          dimensionId: dimension.id,
          evidenceId: record.id,
          reason: "unverified_provenance",
          detail: "No source URI recorded; provenance cannot be independently verified.",
        });
      }

      governedCitations.push({
        evidenceId: record.id,
        sourcePath: record.sourcePath,
        sourceType: record.sourceType,
        sourceSpan: extractSourceSpan(record.text, dimension.keywords),
        confidence: record.extractionConfidence,
        freshnessHours: record.freshnessHours,
        sensitivity: record.sensitivity,
        governed: true,
      });

      // Sensitive-content escalation on cited text.
      for (const trigger of SENSITIVE_TRIGGERS) {
        if (trigger.pattern.test(record.text)) {
          reviewerEscalations.push({
            severity: "high",
            reason: "sensitive_content",
            dimensionId: dimension.id,
            evidenceId: record.id,
            recommendedReviewer: trigger.reviewer,
            detail: `Cited evidence contains ${trigger.detail}; requires ${trigger.reviewer} sign-off.`,
          });
        }
      }
    }

    governedCitations.sort((a, b) => b.confidence - a.confidence);
    const citations = governedCitations.slice(0, opts.maxCitationsPerDimension);
    const coverageConfidence = citations.length ? citations[0].confidence : 0;

    // Determine cell status.
    let status: EvidenceGridCellStatus;
    if (!citations.length) {
      status = sawRestricted || sawUngoverned ? "blocked" : "unsupported";
    } else if (coverageConfidence >= opts.confidenceThreshold && citations[0].freshnessHours <= opts.freshnessMaxHours) {
      status = "supported";
    } else {
      status = "weak";
    }

    grid.push({
      dimensionId: dimension.id,
      label: dimension.label,
      required: dimension.required,
      status,
      coverageConfidence,
      citations,
    });

    // Missing-evidence notes.
    if (status === "unsupported") {
      missingEvidence.push({
        dimensionId: dimension.id,
        label: dimension.label,
        required: dimension.required,
        requirement: dimension.requirement,
        reason: "no_match",
      });
    } else if (status === "blocked") {
      missingEvidence.push({
        dimensionId: dimension.id,
        label: dimension.label,
        required: dimension.required,
        requirement: dimension.requirement,
        reason: sawRestricted ? "only_restricted" : "only_ungoverned",
      });
    }

    // Reviewer escalations for required dimensions.
    if (dimension.required) {
      if (status === "unsupported") {
        reviewerEscalations.push({
          severity: "high",
          reason: "required_dimension_unsupported",
          dimensionId: dimension.id,
          recommendedReviewer: "domain_reviewer",
          detail: `Required dimension '${dimension.label}' has no governed supporting evidence.`,
        });
      } else if (status === "blocked") {
        reviewerEscalations.push({
          severity: "high",
          reason: "blocked_evidence",
          dimensionId: dimension.id,
          recommendedReviewer: sawRestricted ? "data_owner" : "ingestion_steward",
          detail: `Required dimension '${dimension.label}' is only backed by ${sawRestricted ? "restricted" : "ungoverned"} evidence.`,
        });
      } else if (status === "weak") {
        reviewerEscalations.push({
          severity: "medium",
          reason: "required_dimension_weak",
          dimensionId: dimension.id,
          recommendedReviewer: "domain_reviewer",
          detail: `Required dimension '${dimension.label}' is supported only by weak or stale evidence.`,
        });
      }
    }
  }

  const summary = {
    dimensions: grid.length,
    supported: grid.filter((row) => row.status === "supported").length,
    weak: grid.filter((row) => row.status === "weak").length,
    unsupported: grid.filter((row) => row.status === "unsupported").length,
    blocked: grid.filter((row) => row.status === "blocked").length,
    issueCount: issueFlags.length,
    escalationCount: reviewerEscalations.length,
    approvalRequired: reviewerEscalations.length > 0,
  };

  return {
    reviewId: input.reviewId,
    grid,
    issueFlags,
    missingEvidence,
    reviewerEscalations,
    summary,
  };
}

/**
 * Audit events for the approval-gated runtime. The runner persists these via
 * repository.pushAudit; keeping them here means the started/completed contract
 * is defined next to the engine and can be asserted in unit tests.
 */
export function evidenceGridReviewAuditEvents(
  input: Pick<EvidenceGridReviewInput, "reviewId" | "dimensions" | "records">,
  result: EvidenceGridReviewResult
): EvidenceGridAuditEvent[] {
  return [
    {
      type: "native_skill.evidence_grid_review.started",
      payload: {
        reviewId: input.reviewId,
        dimensions: input.dimensions.length,
        candidateRecords: input.records.length,
      },
    },
    {
      type: "native_skill.evidence_grid_review.completed",
      payload: {
        reviewId: input.reviewId,
        ...result.summary,
      },
    },
  ];
}
