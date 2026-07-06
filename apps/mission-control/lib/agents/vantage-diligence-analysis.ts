/**
 * Vantage Diligence Analysis — executable engine
 *
 * Composes the due-diligence checklist library with the evidence grid engine's
 * citation model. Given a deal's governed evidence pool, it produces:
 *   - diligence_coverage: every checklist item, covered or not, with cited
 *     evidence (source spans, provenance, confidence) where present;
 *   - red_flags: uncovered critical/high items (missing evidence is the flag),
 *     each carrying the item's specific red-flag indicator to watch for;
 *   - model_tie_outs: financial items that are covered, marked cited vs.
 *     unverifiable so figures are always tied back to a source;
 *   - ic_memo_sections: the IC memo template populated deterministically from
 *     findings and gaps, so a reviewer edits rather than starts from scratch.
 *
 * Pure and deterministic like the other native engines: no I/O, no LLM, no
 * wall-clock reads. Coverage uses the library's trustworthy tag-match (evidence
 * department vs. item evidenceTags), not semantic inference, so the gap map
 * reflects what is actually in the data room.
 */

import type { EvidenceRecord } from "@/lib/contracts";
import { extractSourceSpan } from "@/lib/agents/evidence-grid-review";
import {
  checklistForDealType,
  IC_MEMO_TEMPLATE,
  type DDChecklistItem,
  type DDSeverity,
  type DealType,
} from "@/lib/domain/dd-checklist-library";

export type VantageDiligenceOptions = {
  /** Only evidence at/above this confidence is cited (below is still counted as covered but flagged). */
  confidenceThreshold?: number;
  /** Max cited evidence records per checklist item. */
  maxCitationsPerItem?: number;
};

export type DiligenceCitation = {
  evidenceId: string;
  sourcePath: string;
  sourceType: EvidenceRecord["sourceType"];
  sourceSpan: string;
  confidence: number;
  freshnessHours: number;
};

export type DiligenceCoverageRow = {
  itemId: string;
  category: string;
  requirement: string;
  severity: DDSeverity;
  covered: boolean;
  citations: DiligenceCitation[];
};

export type DiligenceRedFlag = {
  itemId: string;
  category: string;
  severity: DDSeverity;
  requirement: string;
  indicator: string;
  reason: "missing_critical_evidence" | "missing_high_evidence";
};

export type ModelTieOut = {
  itemId: string;
  requirement: string;
  status: "tied_to_source" | "unverifiable";
  evidenceIds: string[];
};

export type ICMemoSectionDraft = {
  key: string;
  title: string;
  guidance: string;
  status: "populated" | "requires_author" | "flagged";
  content: string[];
};

export type VantageDiligenceAuditEvent = {
  type:
    | "native_skill.vantage_diligence_analysis.started"
    | "native_skill.vantage_diligence_analysis.completed";
  payload: Record<string, unknown>;
};

export type VantageDiligenceResult = {
  reviewId: string;
  dealType: DealType;
  coverage: DiligenceCoverageRow[];
  redFlags: DiligenceRedFlag[];
  modelTieOuts: ModelTieOut[];
  icMemoSections: ICMemoSectionDraft[];
  summary: {
    items: number;
    covered: number;
    gaps: number;
    criticalGaps: number;
    redFlags: number;
    recommendation: "proceed" | "proceed_with_conditions" | "do_not_proceed";
  };
};

const DEFAULTS: Required<VantageDiligenceOptions> = {
  confidenceThreshold: 0.6,
  maxCitationsPerItem: 3,
};

const SEVERITY_ORDER: Record<DDSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const FINANCIAL_CATEGORY_KEY = "financial";

function citeItem(item: DDChecklistItem, records: EvidenceRecord[], opts: Required<VantageDiligenceOptions>): DiligenceCitation[] {
  const tags = item.evidenceTags.map((tag) => tag.toLowerCase());
  const matched = records.filter((record) => {
    const dept = (record.department ?? "").toLowerCase();
    return tags.includes(dept);
  });
  return matched
    .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
    .slice(0, opts.maxCitationsPerItem)
    .map((record) => ({
      evidenceId: record.id,
      sourcePath: record.sourcePath,
      sourceType: record.sourceType,
      sourceSpan: extractSourceSpan(record.text, item.requirement.split(/\s+/).slice(0, 6)),
      confidence: record.extractionConfidence,
      freshnessHours: record.freshnessHours,
    }));
}

export function analyzeVantageDiligence(input: {
  reviewId: string;
  dealType: DealType;
  records: EvidenceRecord[];
  options?: VantageDiligenceOptions;
}): VantageDiligenceResult {
  const opts = { ...DEFAULTS, ...(input.options ?? {}) };
  // Only cite governed evidence; ungoverned records never back a diligence finding.
  const governed = input.records.filter((record) => record.ingestionStatus === "processed");
  const categories = checklistForDealType(input.dealType);

  const coverage: DiligenceCoverageRow[] = [];
  const redFlags: DiligenceRedFlag[] = [];
  const modelTieOuts: ModelTieOut[] = [];

  for (const category of categories) {
    for (const item of category.items) {
      const citations = citeItem(item, governed, opts);
      const covered = citations.length > 0;

      coverage.push({
        itemId: item.id,
        category: category.label,
        requirement: item.requirement,
        severity: item.severity,
        covered,
        citations,
      });

      if (!covered && (item.severity === "critical" || item.severity === "high")) {
        redFlags.push({
          itemId: item.id,
          category: category.label,
          severity: item.severity,
          requirement: item.requirement,
          indicator: item.redFlagIndicator,
          reason: item.severity === "critical" ? "missing_critical_evidence" : "missing_high_evidence",
        });
      }

      if (category.key === FINANCIAL_CATEGORY_KEY) {
        const withNumbers = citations.filter((citation) => /\d/.test(citation.sourceSpan));
        modelTieOuts.push({
          itemId: item.id,
          requirement: item.requirement,
          status: withNumbers.length > 0 ? "tied_to_source" : "unverifiable",
          evidenceIds: withNumbers.map((citation) => citation.evidenceId),
        });
      }
    }
  }

  redFlags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const gaps = coverage.filter((row) => !row.covered);
  const criticalGaps = gaps.filter((row) => row.severity === "critical").length;
  const recommendation: VantageDiligenceResult["summary"]["recommendation"] =
    criticalGaps > 0 ? "do_not_proceed" : gaps.length > 0 ? "proceed_with_conditions" : "proceed";

  const icMemoSections = buildIcMemoSections({ coverage, redFlags, gaps, recommendation });

  return {
    reviewId: input.reviewId,
    dealType: input.dealType,
    coverage,
    redFlags,
    modelTieOuts,
    icMemoSections,
    summary: {
      items: coverage.length,
      covered: coverage.filter((row) => row.covered).length,
      gaps: gaps.length,
      criticalGaps,
      redFlags: redFlags.length,
      recommendation,
    },
  };
}

function buildIcMemoSections(args: {
  coverage: DiligenceCoverageRow[];
  redFlags: DiligenceRedFlag[];
  gaps: DiligenceCoverageRow[];
  recommendation: VantageDiligenceResult["summary"]["recommendation"];
}): ICMemoSectionDraft[] {
  return IC_MEMO_TEMPLATE.map((section) => {
    switch (section.key) {
      case "financial_summary": {
        const financial = args.coverage.filter((row) => row.category.toLowerCase().startsWith("financial") && row.covered);
        return {
          ...section,
          status: financial.length ? "populated" : "requires_author",
          content: financial.flatMap((row) => row.citations.map((c) => `${row.requirement}: ${c.sourcePath} — “${c.sourceSpan}”`)),
        };
      }
      case "red_flags":
        return {
          ...section,
          status: args.redFlags.length ? "flagged" : "populated",
          content: args.redFlags.map((flag) => `[${flag.severity}] ${flag.requirement} — watch for: ${flag.indicator}`),
        };
      case "coverage_gaps":
        return {
          ...section,
          status: args.gaps.length ? "flagged" : "populated",
          content: args.gaps.map((row) => `[${row.severity}] ${row.category}: ${row.requirement}`),
        };
      case "regulatory_position": {
        const regulatory = args.coverage.filter((row) => row.category.toLowerCase().startsWith("regulatory") && row.covered);
        return {
          ...section,
          status: regulatory.length ? "populated" : "requires_author",
          content: regulatory.flatMap((row) => row.citations.map((c) => `${row.requirement}: ${c.sourcePath}`)),
        };
      }
      case "recommendation":
        return {
          ...section,
          status: "populated",
          content: [`Signal from evidence coverage: ${args.recommendation.replaceAll("_", " ")}. Author must confirm with reasoning chain.`],
        };
      default:
        // thesis and any future author-owned sections
        return { ...section, status: "requires_author", content: [] };
    }
  });
}

export function vantageDiligenceAuditEvents(
  input: { reviewId: string; dealType: DealType; records: EvidenceRecord[] },
  result: VantageDiligenceResult
): VantageDiligenceAuditEvent[] {
  return [
    {
      type: "native_skill.vantage_diligence_analysis.started",
      payload: { reviewId: input.reviewId, dealType: input.dealType, candidateRecords: input.records.length },
    },
    {
      type: "native_skill.vantage_diligence_analysis.completed",
      payload: { reviewId: input.reviewId, ...result.summary },
    },
  ];
}
