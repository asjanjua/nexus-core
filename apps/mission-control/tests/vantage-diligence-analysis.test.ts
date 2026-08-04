import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/lib/contracts";
import {
  analyzeVantageDiligence,
  vantageDiligenceAuditEvents,
} from "@/lib/agents/vantage-diligence-analysis";
import { checklistForDealType } from "@/lib/domain/dd-checklist-library";

const NOW = "2026-07-06T00:00:00.000Z";

/**
 * `docType` drives the FILENAME, because that is what coverage matches on.
 *
 * These fixtures previously set the `department` field to "Financial
 * Statements" and let the filename be arbitrary. That encoded the bug the
 * engine had: real department values are things like "Finance", never
 * "Financial Statements", so genuine evidence could never be cited while the
 * fixtures always were — the tests passed precisely because they were wrong.
 * Naming the file after the document type is what a real data room looks like.
 */
function evidence(
  patch: Partial<EvidenceRecord> & { id: string; docType: string }
): EvidenceRecord {
  const { docType, ...rest } = patch;
  return {
    tenantId: "tenant-a",
    workspaceId: "deal-a",
    sourceType: "finance_export",
    // Department is deliberately a plausible functional value, not the
    // document type — coverage must not depend on it.
    department: "Finance",
    sourcePath: `/deal/${docType}.pdf`,
    sourceUri: `https://vault.local/${patch.id}`,
    sourceTimestamp: NOW,
    ingestedAt: NOW,
    hash: `sha256:${patch.id}`,
    sensitivity: "confidential",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 3,
    text: "Placeholder deal evidence.",
    ...rest,
  };
}

describe("vantage diligence analysis engine", () => {
  it("cites covered items and marks uncovered checklist items as gaps", () => {
    const result = analyzeVantageDiligence({
      reviewId: "deal-1",
      dealType: "fintech_ma",
      records: [
        evidence({ id: "fin-stmt", docType: "Financial Statements", text: "Audited statements: revenue 12.4M in FY24." }),
      ],
    });

    const covered = result.coverage.find((row) => row.itemId === "fin-01");
    expect(covered?.covered).toBe(true);
    expect(covered?.citations[0].sourcePath).toBe("/deal/Financial Statements.pdf");
    // Every checklist item is represented in coverage.
    const totalItems = checklistForDealType("fintech_ma").reduce((n, cat) => n + cat.items.length, 0);
    expect(result.coverage).toHaveLength(totalItems);
    expect(result.summary.covered).toBe(1);
  });

  it("does not cite a document because of its department", () => {
    // The regression. A record whose department happens to read like a
    // checklist tag, but whose filename says nothing, must not be cited.
    // Before the fix the engine compared evidenceTags to department, so this
    // was the ONLY thing that could ever produce a citation.
    const result = analyzeVantageDiligence({
      reviewId: "deal-regression",
      dealType: "fintech_ma",
      records: [
        evidence({
          id: "mislabelled",
          docType: "scan_0042",
          department: "Financial Statements",
          text: "Audited revenue 12.4M.",
        }),
      ],
    });

    expect(result.coverage.find((row) => row.itemId === "fin-01")?.covered).toBe(false);
    expect(result.summary.covered).toBe(0);
  });

  it("raises a red flag for every uncovered critical or high item with its indicator", () => {
    const result = analyzeVantageDiligence({
      reviewId: "deal-2",
      dealType: "fintech_ma",
      records: [],
    });

    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.redFlags.every((flag) => flag.severity === "critical" || flag.severity === "high")).toBe(true);
    expect(result.redFlags.every((flag) => flag.indicator.length > 0)).toBe(true);
    // Critical flags sort ahead of high.
    const firstHighIndex = result.redFlags.findIndex((flag) => flag.severity === "high");
    const lastCriticalIndex = result.redFlags.map((flag) => flag.severity).lastIndexOf("critical");
    if (firstHighIndex !== -1) expect(lastCriticalIndex).toBeLessThan(firstHighIndex);
  });

  it("recommends do_not_proceed when a critical item has no evidence", () => {
    const result = analyzeVantageDiligence({ reviewId: "deal-3", dealType: "fintech_ma", records: [] });
    expect(result.summary.recommendation).toBe("do_not_proceed");
    expect(result.summary.criticalGaps).toBeGreaterThan(0);
  });

  it("ties financial items to source only when cited evidence carries numbers", () => {
    const result = analyzeVantageDiligence({
      reviewId: "deal-4",
      dealType: "fintech_ma",
      records: [
        evidence({ id: "fin-stmt", docType: "Financial Statements", text: "Audited revenue was 12.4M with 38% margin." }),
        evidence({ id: "mgmt", docType: "Management Accounts", text: "Narrative summary with no figures provided here." }),
      ],
    });

    const tied = result.modelTieOuts.find((t) => t.itemId === "fin-01");
    const untied = result.modelTieOuts.find((t) => t.itemId === "fin-02");
    expect(tied?.status).toBe("tied_to_source");
    expect(untied?.status).toBe("unverifiable");
  });

  it("never cites ungoverned evidence", () => {
    const result = analyzeVantageDiligence({
      reviewId: "deal-5",
      dealType: "fintech_ma",
      records: [
        evidence({ id: "pending", docType: "Financial Statements", ingestionStatus: "quarantined", text: "Revenue 9M." }),
      ],
    });

    expect(result.coverage.find((row) => row.itemId === "fin-01")?.covered).toBe(false);
  });

  it("populates IC memo sections and flags red flags and gaps", () => {
    const result = analyzeVantageDiligence({
      reviewId: "deal-6",
      dealType: "fintech_ma",
      records: [evidence({ id: "fin-stmt", docType: "Financial Statements", text: "Revenue 12.4M audited." })],
    });

    const keys = result.icMemoSections.map((s) => s.key);
    expect(keys).toContain("red_flags");
    expect(keys).toContain("coverage_gaps");
    expect(result.icMemoSections.find((s) => s.key === "red_flags")?.status).toBe("flagged");
    expect(result.icMemoSections.find((s) => s.key === "thesis")?.status).toBe("requires_author");
    expect(result.icMemoSections.find((s) => s.key === "financial_summary")?.content.length).toBeGreaterThan(0);
  });

  it("emits started and completed audit events with the summary", () => {
    const input = { reviewId: "deal-7", dealType: "fintech_ma" as const, records: [] };
    const result = analyzeVantageDiligence(input);
    const events = vantageDiligenceAuditEvents(input, result);

    expect(events.map((e) => e.type)).toEqual([
      "native_skill.vantage_diligence_analysis.started",
      "native_skill.vantage_diligence_analysis.completed",
    ]);
    expect(events[1].payload).toMatchObject({ reviewId: "deal-7", recommendation: "do_not_proceed" });
  });
});
