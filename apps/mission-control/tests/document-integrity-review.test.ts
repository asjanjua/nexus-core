import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/lib/contracts";
import {
  documentIntegrityAuditEvents,
  reviewDocumentIntegrity,
} from "@/lib/agents/document-integrity-review";

const NOW = "2026-07-06T00:00:00.000Z";

function evidence(patch: Partial<EvidenceRecord> & { id: string }): EvidenceRecord {
  return {
    tenantId: "tenant-a",
    workspaceId: "workspace-a",
    sourceType: "pdf",
    department: "Finance",
    sourcePath: `/docs/${patch.id}.pdf`,
    sourceUri: `https://vault.local/${patch.id}`,
    sourceTimestamp: NOW,
    ingestedAt: NOW,
    hash: `sha256:${patch.id}`,
    sensitivity: "internal",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 2,
    text: "This is a cleanly parsed document with plenty of readable content.",
    ...patch,
  };
}

describe("document integrity review engine", () => {
  it("passes a clean document with a source span and no findings", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-1",
      records: [evidence({ id: "doc-clean" })],
    });

    const record = result.records[0];
    expect(record.findings).toHaveLength(0);
    expect(record.sourceSpan).toContain("cleanly parsed document");
    expect(result.summary.clean).toBe(1);
    expect(result.summary.parseQualityScore).toBeCloseTo(0.9);
  });

  it("flags empty text and records a missing source span", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-2",
      records: [evidence({ id: "doc-empty", text: "" })],
    });

    const reasons = result.records[0].findings.map((f) => f.reason);
    expect(reasons).toContain("empty_text");
    expect(reasons).toContain("missing_source_span");
    expect(result.missingSourceSpans).toEqual(["doc-empty"]);
  });

  it("flags weak extraction, staleness, and missing provenance", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-3",
      records: [
        evidence({ id: "doc-weak", extractionConfidence: 0.3, freshnessHours: 500, sourceUri: undefined }),
      ],
    });

    const reasons = result.records[0].findings.map((f) => f.reason).sort();
    expect(reasons).toEqual(["stale_evidence", "unverified_provenance", "weak_extraction"]);
    expect(result.records[0].parseQuality).toBeLessThan(0.3);
  });

  it("flags ungoverned documents rather than hiding them", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-4",
      records: [evidence({ id: "doc-pending", ingestionStatus: "quarantined" })],
    });

    expect(result.records[0].findings.map((f) => f.reason)).toContain("ungoverned_status");
  });

  it("flags spreadsheet sources with no tabular structure", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-5",
      records: [
        evidence({ id: "sheet-bad", sourceType: "xlsx", text: "no numbers or delimiters here just prose words" }),
        evidence({ id: "sheet-ok", sourceType: "xlsx", text: "Revenue, 100, 200, 300 across quarters" }),
      ],
    });

    const bad = result.records.find((r) => r.evidenceId === "sheet-bad");
    const okRow = result.records.find((r) => r.evidenceId === "sheet-ok");
    expect(bad?.findings.map((f) => f.reason)).toContain("missing_tabular_structure");
    expect(okRow?.findings.map((f) => f.reason)).not.toContain("missing_tabular_structure");
  });

  it("turns findings into concrete repair recommendations", () => {
    const result = reviewDocumentIntegrity({
      reviewId: "int-6",
      records: [evidence({ id: "doc-noprov", sourceUri: undefined })],
    });

    expect(result.repairRecommendations).toContainEqual({
      evidenceId: "doc-noprov",
      recommendation: "Record a source URI so provenance can be independently verified.",
    });
  });

  it("emits started and completed audit events with the summary", () => {
    const input = { reviewId: "int-7", records: [evidence({ id: "doc-clean" })] };
    const result = reviewDocumentIntegrity(input);
    const events = documentIntegrityAuditEvents(input, result);

    expect(events.map((e) => e.type)).toEqual([
      "native_skill.document_integrity_review.started",
      "native_skill.document_integrity_review.completed",
    ]);
    expect(events[1].payload).toMatchObject({ reviewId: "int-7", documents: 1, clean: 1 });
  });
});
