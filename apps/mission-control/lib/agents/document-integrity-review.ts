/**
 * Document Integrity Review — executable engine
 *
 * Companion to the evidence grid engine. Where the grid answers "is this
 * review dimension supported by evidence?", this answers "is each parsed
 * document clean enough to be cited at all?". It scores per-record parse
 * quality, flags integrity problems (missing text, weak extraction, no source
 * span, missing provenance, ungoverned status, absent tabular structure for
 * spreadsheet sources), lists records with no usable source span, and turns
 * findings into concrete repair recommendations.
 *
 * Pure and deterministic like the grid engine; it reuses extractSourceSpan so
 * both skills quote sources identically. Repository loading and audit emission
 * live in the runner.
 */

import type { EvidenceRecord } from "@/lib/contracts";
import { extractSourceSpan } from "@/lib/agents/evidence-grid-review";

export type DocumentIntegrityOptions = {
  /** Extraction confidence below this is a weak-parse finding. */
  confidenceThreshold?: number;
  /** Evidence older than this many hours is a staleness finding. */
  freshnessMaxHours?: number;
  /** Minimum characters of parsed text before a document counts as parsed. */
  minTextLength?: number;
};

export type DocumentIntegrityReason =
  | "empty_text"
  | "weak_extraction"
  | "stale_evidence"
  | "missing_source_span"
  | "unverified_provenance"
  | "ungoverned_status"
  | "missing_tabular_structure";

export type DocumentIntegrityFinding = {
  reason: DocumentIntegrityReason;
  detail: string;
};

export type DocumentIntegrityRecord = {
  evidenceId: string;
  sourcePath: string;
  sourceType: EvidenceRecord["sourceType"];
  sourceSpan: string | null;
  parseQuality: number; // 0..1 for this record
  findings: DocumentIntegrityFinding[];
};

export type DocumentIntegrityAuditEvent = {
  type:
    | "native_skill.document_integrity_review.started"
    | "native_skill.document_integrity_review.completed";
  payload: Record<string, unknown>;
};

export type DocumentIntegrityReviewResult = {
  reviewId: string;
  records: DocumentIntegrityRecord[];
  missingSourceSpans: string[];
  repairRecommendations: Array<{ evidenceId: string; recommendation: string }>;
  summary: {
    documents: number;
    clean: number;
    withFindings: number;
    parseQualityScore: number; // mean across records, 0..1
    findingCount: number;
  };
};

const DEFAULTS: Required<DocumentIntegrityOptions> = {
  confidenceThreshold: 0.6,
  freshnessMaxHours: 168,
  minTextLength: 20,
};

const TABULAR_SOURCE_TYPES: ReadonlySet<EvidenceRecord["sourceType"]> = new Set([
  "xlsx",
  "csv",
  "finance_export",
  "ad_performance",
  "local_ad_performance",
]);

const REPAIR_BY_REASON: Record<DocumentIntegrityReason, string> = {
  empty_text: "Re-run extraction; the parsed text is empty or below the minimum length.",
  weak_extraction: "Re-parse with OCR or a higher-fidelity extractor; extraction confidence is low.",
  stale_evidence: "Refresh the source; the document is beyond the freshness window.",
  missing_source_span: "Capture a quotable source span so findings can be cited.",
  unverified_provenance: "Record a source URI so provenance can be independently verified.",
  ungoverned_status: "Route through ingestion governance before this document is cited.",
  missing_tabular_structure: "Re-extract the table; no rows or numeric structure were detected.",
};

function hasTabularStructure(text: string): boolean {
  // Cheap deterministic heuristic: real table extracts carry delimiters or
  // several numbers. A prose blob with no digits fails.
  const numbers = text.match(/\d/g)?.length ?? 0;
  return /[\t|,]/.test(text) || numbers >= 3;
}

export function reviewDocumentIntegrity(input: {
  reviewId: string;
  records: EvidenceRecord[];
  options?: DocumentIntegrityOptions;
}): DocumentIntegrityReviewResult {
  const opts = { ...DEFAULTS, ...(input.options ?? {}) };
  const records: DocumentIntegrityRecord[] = [];
  const missingSourceSpans: string[] = [];
  const repairRecommendations: Array<{ evidenceId: string; recommendation: string }> = [];

  for (const record of input.records) {
    const findings: DocumentIntegrityFinding[] = [];
    const text = record.text ?? "";

    if (text.trim().length < opts.minTextLength) {
      findings.push({ reason: "empty_text", detail: `Parsed text is ${text.trim().length} chars, below the ${opts.minTextLength}-char minimum.` });
    }
    if (record.extractionConfidence < opts.confidenceThreshold) {
      findings.push({ reason: "weak_extraction", detail: `Extraction confidence ${Math.round(record.extractionConfidence * 100)}% is below the ${Math.round(opts.confidenceThreshold * 100)}% bar.` });
    }
    if (record.freshnessHours > opts.freshnessMaxHours) {
      findings.push({ reason: "stale_evidence", detail: `Document is ${record.freshnessHours}h old, beyond the ${opts.freshnessMaxHours}h window.` });
    }
    if (!record.sourceUri) {
      findings.push({ reason: "unverified_provenance", detail: "No source URI recorded." });
    }
    if (record.ingestionStatus !== "processed") {
      findings.push({ reason: "ungoverned_status", detail: `Ingestion status is '${record.ingestionStatus}', not cleared.` });
    }
    if (TABULAR_SOURCE_TYPES.has(record.sourceType) && !hasTabularStructure(text)) {
      findings.push({ reason: "missing_tabular_structure", detail: `Source type '${record.sourceType}' has no detectable rows or numeric structure.` });
    }

    const span = text.trim().length >= opts.minTextLength ? extractSourceSpan(text, []) : null;
    if (!span) {
      findings.push({ reason: "missing_source_span", detail: "No quotable source span could be extracted." });
      missingSourceSpans.push(record.id);
    }

    // Per-record parse quality: start from extraction confidence, subtract for
    // each finding, floored at 0.
    const parseQuality = Math.max(0, Math.min(1, record.extractionConfidence - findings.length * 0.15));

    for (const finding of findings) {
      repairRecommendations.push({ evidenceId: record.id, recommendation: REPAIR_BY_REASON[finding.reason] });
    }

    records.push({
      evidenceId: record.id,
      sourcePath: record.sourcePath,
      sourceType: record.sourceType,
      sourceSpan: span,
      parseQuality,
      findings,
    });
  }

  const withFindings = records.filter((record) => record.findings.length > 0).length;
  const parseQualityScore = records.length
    ? records.reduce((sum, record) => sum + record.parseQuality, 0) / records.length
    : 0;

  return {
    reviewId: input.reviewId,
    records,
    missingSourceSpans,
    repairRecommendations,
    summary: {
      documents: records.length,
      clean: records.length - withFindings,
      withFindings,
      parseQualityScore,
      findingCount: records.reduce((sum, record) => sum + record.findings.length, 0),
    },
  };
}

export function documentIntegrityAuditEvents(
  input: { reviewId: string; records: EvidenceRecord[] },
  result: DocumentIntegrityReviewResult
): DocumentIntegrityAuditEvent[] {
  return [
    {
      type: "native_skill.document_integrity_review.started",
      payload: { reviewId: input.reviewId, candidateRecords: input.records.length },
    },
    {
      type: "native_skill.document_integrity_review.completed",
      payload: { reviewId: input.reviewId, ...result.summary },
    },
  ];
}
