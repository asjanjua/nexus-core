import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/lib/contracts";
import {
  meridianComplianceAuditEvents,
  reviewMeridianCompliance,
} from "@/lib/agents/meridian-compliance-review";

const NOW = "2026-07-06T00:00:00.000Z";
const LICENSE = "secp_nbfc_investment_finance";

function evidence(patch: Partial<EvidenceRecord> & { id: string; department: string }): EvidenceRecord {
  return {
    tenantId: "tenant-a",
    workspaceId: "submission-a",
    sourceType: "document",
    sourcePath: `/submission/${patch.id}.pdf`,
    sourceUri: `https://vault.local/${patch.id}`,
    sourceTimestamp: NOW,
    ingestedAt: NOW,
    hash: `sha256:${patch.id}`,
    sensitivity: "confidential",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 3,
    text: "Regulatory submission evidence.",
    ...patch,
  };
}

describe("meridian compliance review engine", () => {
  it("cites governed evidence to a requirement via department tag", () => {
    const result = reviewMeridianCompliance({
      reviewId: "sub-1",
      licenseTypeKey: LICENSE,
      status: "aspirational",
      records: [evidence({ id: "cap", department: "Capital Adequacy Evidence", text: "Paid-up capital exceeds the category threshold." })],
    });

    const capital = result.requirementCoverage.find((row) => row.itemId === "secp-if-01");
    expect(capital?.covered).toBe(true);
    expect(capital?.citations[0].sourcePath).toBe("/submission/cap.pdf");
    expect(result.jurisdiction).toBe("Pakistan");
  });

  it("lists compliance gaps most severe first with the library indicator", () => {
    const result = reviewMeridianCompliance({ reviewId: "sub-2", licenseTypeKey: LICENSE, status: "aspirational", records: [] });

    expect(result.complianceGaps.length).toBeGreaterThan(0);
    expect(result.complianceGaps[0].severity).toBe("critical");
    expect(result.complianceGaps.every((gap) => gap.indicator.length > 0)).toBe(true);
    expect(result.summary.filingReady).toBe(false);
    expect(result.summary.criticalGaps).toBeGreaterThan(0);
  });

  it("builds a qualified-reviewer packet with the standing boundary", () => {
    const result = reviewMeridianCompliance({ reviewId: "sub-3", licenseTypeKey: LICENSE, status: "aspirational", records: [] });

    expect(result.qualifiedReviewerPacket.some((i) => i.refId === "qualified-reviewer-required")).toBe(true);
    expect(result.qualifiedReviewerPacket.every((i) => i.requiresQualifiedReviewer)).toBe(true);
    // Only critical/high requirements (plus the boundary) are in the packet.
    expect(result.qualifiedReviewerPacket.filter((i) => i.kind === "requirement").every((i) => i.severity === "critical" || i.severity === "high")).toBe(true);
  });

  it("always includes not-legal-advice and jurisdiction filing caveats", () => {
    const result = reviewMeridianCompliance({ reviewId: "sub-4", licenseTypeKey: LICENSE, status: "aspirational", records: [] });
    const boundaryRefs = result.filingCaveats.filter((c) => c.source === "compliance_boundary").map((c) => c.refId);
    expect(boundaryRefs).toContain("not-legal-advice");
    expect(boundaryRefs).toContain("jurisdiction-review");
    expect(result.filingCaveats.find((c) => c.refId === "jurisdiction-review")?.detail).toContain("Pakistan");
  });

  it("never cites ungoverned evidence", () => {
    const result = reviewMeridianCompliance({
      reviewId: "sub-5",
      licenseTypeKey: LICENSE,
      status: "aspirational",
      records: [evidence({ id: "cap", department: "Capital Adequacy Evidence", ingestionStatus: "pending_approval", text: "Capital draft." })],
    });

    expect(result.requirementCoverage.find((row) => row.itemId === "secp-if-01")?.covered).toBe(false);
  });

  it("emits started and completed audit events with the summary", () => {
    const input = { reviewId: "sub-6", licenseTypeKey: LICENSE, status: "aspirational" as const, records: [] };
    const result = reviewMeridianCompliance(input);
    const events = meridianComplianceAuditEvents(input, result);

    expect(events.map((e) => e.type)).toEqual([
      "native_skill.meridian_compliance_review.started",
      "native_skill.meridian_compliance_review.completed",
    ]);
    expect(events[1].payload).toMatchObject({ reviewId: "sub-6", filingReady: false });
  });
});
