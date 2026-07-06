/**
 * Meridian Compliance Review — executable engine
 *
 * Maps a regulator + license type's requirements to a submission's governed
 * evidence and produces:
 *   - requirementCoverage: every requirement, covered or not, with cited
 *     evidence (source spans, provenance, confidence);
 *   - complianceGaps: uncovered requirements, most severe first, each with the
 *     library's gap indicator so a reviewer knows what a shortfall looks like;
 *   - qualifiedReviewerPacket: the critical/high requirements a qualified
 *     compliance or legal reviewer must clear before filing, plus the standing
 *     "qualified reviewer required" boundary (Meridian never files or certifies
 *     compliance on its own);
 *   - filingCaveats: missing critical/high requirements plus the not-legal-
 *     advice and jurisdiction-review caveats, so a pack is never treated as
 *     filing-ready on Meridian's word alone.
 *
 * Pure and deterministic. Coverage uses the library's trustworthy department-
 * tag match, and only `processed` evidence is ever cited.
 */

import type { EvidenceRecord } from "@/lib/contracts";
import { extractSourceSpan } from "@/lib/agents/evidence-grid-review";
import {
  REGULATORS,
  requirementsFor,
  type LicenseStatus,
  type RequirementItem,
  type RequirementSeverity,
} from "@/lib/domain/regulatory-requirement-library";

export type MeridianComplianceOptions = {
  maxCitationsPerRequirement?: number;
};

export type ComplianceCitation = {
  evidenceId: string;
  sourcePath: string;
  sourceSpan: string;
  confidence: number;
  freshnessHours: number;
};

export type RequirementCoverageRow = {
  itemId: string;
  requirement: string;
  severity: RequirementSeverity;
  covered: boolean;
  citations: ComplianceCitation[];
};

export type ComplianceGap = {
  itemId: string;
  requirement: string;
  severity: RequirementSeverity;
  indicator: string;
};

export type QualifiedReviewerItem = {
  kind: "requirement" | "compliance_boundary";
  refId: string;
  severity: RequirementSeverity | "high";
  covered: boolean;
  summary: string;
  requiresQualifiedReviewer: true;
};

export type FilingCaveat = {
  source: "missing_requirement" | "compliance_boundary";
  refId: string;
  detail: string;
  severity: RequirementSeverity;
};

export type MeridianComplianceAuditEvent = {
  type:
    | "native_skill.meridian_compliance_review.started"
    | "native_skill.meridian_compliance_review.completed";
  payload: Record<string, unknown>;
};

export type MeridianComplianceResult = {
  reviewId: string;
  licenseTypeKey: string;
  status: LicenseStatus;
  jurisdiction: string;
  requirementCoverage: RequirementCoverageRow[];
  complianceGaps: ComplianceGap[];
  qualifiedReviewerPacket: QualifiedReviewerItem[];
  filingCaveats: FilingCaveat[];
  summary: {
    requirements: number;
    covered: number;
    gaps: number;
    criticalGaps: number;
    reviewerItems: number;
    filingReady: boolean;
  };
};

const DEFAULTS: Required<MeridianComplianceOptions> = {
  maxCitationsPerRequirement: 3,
};

const SEVERITY_ORDER: Record<RequirementSeverity, number> = { critical: 0, high: 1, medium: 2 };

function jurisdictionForLicenseType(licenseTypeKey: string): string {
  for (const regulator of REGULATORS) {
    if (regulator.licenseTypes.some((license) => license.key === licenseTypeKey)) {
      return regulator.jurisdiction;
    }
  }
  return "unspecified";
}

function citeRequirement(item: RequirementItem, records: EvidenceRecord[], max: number): ComplianceCitation[] {
  const tags = item.evidenceTags.map((tag) => tag.toLowerCase());
  return records
    .filter((record) => tags.includes((record.department ?? "").toLowerCase()))
    .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
    .slice(0, max)
    .map((record) => ({
      evidenceId: record.id,
      sourcePath: record.sourcePath,
      sourceSpan: extractSourceSpan(record.text, item.requirement.split(/\s+/).slice(0, 6)),
      confidence: record.extractionConfidence,
      freshnessHours: record.freshnessHours,
    }));
}

export function reviewMeridianCompliance(input: {
  reviewId: string;
  licenseTypeKey: string;
  status: LicenseStatus;
  records: EvidenceRecord[];
  options?: MeridianComplianceOptions;
}): MeridianComplianceResult {
  const opts = { ...DEFAULTS, ...(input.options ?? {}) };
  const governed = input.records.filter((record) => record.ingestionStatus === "processed");
  const requirements = requirementsFor(input.licenseTypeKey, input.status);

  const requirementCoverage: RequirementCoverageRow[] = requirements.map((item) => {
    const citations = citeRequirement(item, governed, opts.maxCitationsPerRequirement);
    return {
      itemId: item.id,
      requirement: item.requirement,
      severity: item.severity,
      covered: citations.length > 0,
      citations,
    };
  });

  const complianceGaps: ComplianceGap[] = requirements
    .filter((item) => !requirementCoverage.find((row) => row.itemId === item.id)?.covered)
    .map((item) => ({ itemId: item.id, requirement: item.requirement, severity: item.severity, indicator: item.gapIndicator }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const qualifiedReviewerPacket: QualifiedReviewerItem[] = requirementCoverage
    .filter((row) => row.severity === "critical" || row.severity === "high")
    .map((row) => ({
      kind: "requirement" as const,
      refId: row.itemId,
      severity: row.severity,
      covered: row.covered,
      summary: row.covered
        ? `${row.requirement}: cited evidence must be verified by a qualified reviewer.`
        : `${row.requirement}: no evidence — a qualified reviewer must confirm remediation before filing.`,
      requiresQualifiedReviewer: true,
    }));
  qualifiedReviewerPacket.push({
    kind: "compliance_boundary",
    refId: "qualified-reviewer-required",
    severity: "high",
    covered: false,
    summary: "Meridian maps requirements to evidence; a qualified compliance or legal reviewer must clear the pack before any filing or certification.",
    requiresQualifiedReviewer: true,
  });

  const filingCaveats: FilingCaveat[] = [];
  for (const gap of complianceGaps) {
    if (gap.severity === "critical" || gap.severity === "high") {
      filingCaveats.push({ source: "missing_requirement", refId: gap.itemId, detail: `No evidence for: ${gap.requirement}. ${gap.indicator}`, severity: gap.severity });
    }
  }
  filingCaveats.push({
    source: "compliance_boundary",
    refId: "not-legal-advice",
    detail: "Meridian output is not legal or regulatory advice and is not a substitute for the regulator's own determination.",
    severity: "high",
  });
  filingCaveats.push({
    source: "compliance_boundary",
    refId: "jurisdiction-review",
    detail: `Requirements are jurisdiction-specific (${jurisdictionForLicenseType(input.licenseTypeKey)}) and must be confirmed against the current source rules before filing.`,
    severity: "high",
  });

  const covered = requirementCoverage.filter((row) => row.covered).length;
  const criticalGaps = complianceGaps.filter((gap) => gap.severity === "critical").length;

  return {
    reviewId: input.reviewId,
    licenseTypeKey: input.licenseTypeKey,
    status: input.status,
    jurisdiction: jurisdictionForLicenseType(input.licenseTypeKey),
    requirementCoverage,
    complianceGaps,
    qualifiedReviewerPacket,
    filingCaveats,
    summary: {
      requirements: requirementCoverage.length,
      covered,
      gaps: complianceGaps.length,
      criticalGaps,
      reviewerItems: qualifiedReviewerPacket.length,
      filingReady: criticalGaps === 0 && complianceGaps.length === 0,
    },
  };
}

export function meridianComplianceAuditEvents(
  input: { reviewId: string; licenseTypeKey: string; status: LicenseStatus; records: EvidenceRecord[] },
  result: MeridianComplianceResult
): MeridianComplianceAuditEvent[] {
  return [
    {
      type: "native_skill.meridian_compliance_review.started",
      payload: {
        reviewId: input.reviewId,
        licenseTypeKey: input.licenseTypeKey,
        status: input.status,
        candidateRecords: input.records.length,
      },
    },
    {
      type: "native_skill.meridian_compliance_review.completed",
      payload: { reviewId: input.reviewId, ...result.summary },
    },
  ];
}
