import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/lib/contracts";
import {
  evidenceGridReviewAuditEvents,
  reviewEvidenceGrid,
  type EvidenceGridDimension,
} from "@/lib/agents/evidence-grid-review";

const NOW = "2026-07-06T00:00:00.000Z";

function evidence(patch: Partial<EvidenceRecord> & { id: string }): EvidenceRecord {
  return {
    tenantId: "tenant-a",
    workspaceId: "workspace-a",
    sourceType: "finance_export",
    department: "Finance",
    sourcePath: `/finance/${patch.id}.xlsx`,
    sourceUri: `https://vault.local/${patch.id}`,
    sourceTimestamp: NOW,
    ingestedAt: NOW,
    hash: `sha256:${patch.id}`,
    sensitivity: "internal",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 2,
    text: "Placeholder evidence text.",
    ...patch,
  };
}

const REVENUE: EvidenceGridDimension = {
  id: "revenue_actuals",
  label: "Revenue actuals",
  requirement: "Board-ready revenue figure with source.",
  keywords: ["revenue", "turnover"],
  required: true,
};
const RUNWAY: EvidenceGridDimension = {
  id: "cash_runway",
  label: "Cash runway",
  requirement: "Months of runway at current burn.",
  keywords: ["runway", "cash burn"],
  required: true,
};

describe("evidence grid review engine", () => {
  it("cites governed evidence with a source span and marks the cell supported", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-1",
      dimensions: [REVENUE],
      records: [
        evidence({ id: "ev-rev", text: "Q2 revenue reached 4.2M. Margins held at 38%." }),
      ],
      now: NOW,
    });

    const row = result.grid[0];
    expect(row.status).toBe("supported");
    expect(row.citations).toHaveLength(1);
    expect(row.citations[0].evidenceId).toBe("ev-rev");
    expect(row.citations[0].sourceSpan).toContain("revenue reached 4.2M");
    expect(result.summary.approvalRequired).toBe(false);
  });

  it("flags low confidence and stale evidence and downgrades the cell to weak", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-2",
      dimensions: [REVENUE],
      records: [
        evidence({ id: "ev-weak", text: "Revenue estimate is rough.", extractionConfidence: 0.4, freshnessHours: 400 }),
      ],
      now: NOW,
    });

    expect(result.grid[0].status).toBe("weak");
    const reasons = result.issueFlags.map((flag) => flag.reason).sort();
    expect(reasons).toEqual(["low_confidence", "stale_evidence"]);
    expect(result.reviewerEscalations.map((e) => e.reason)).toContain("required_dimension_weak");
  });

  it("writes a missing-evidence note and high escalation when a required dimension has no match", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-3",
      dimensions: [REVENUE, RUNWAY],
      records: [evidence({ id: "ev-rev", text: "Revenue was 4.2M this quarter." })],
      now: NOW,
    });

    const runwayRow = result.grid.find((row) => row.dimensionId === "cash_runway");
    expect(runwayRow?.status).toBe("unsupported");
    expect(result.missingEvidence).toEqual([
      { dimensionId: "cash_runway", label: "Cash runway", required: true, requirement: RUNWAY.requirement, reason: "no_match" },
    ]);
    const escalation = result.reviewerEscalations.find((e) => e.dimensionId === "cash_runway");
    expect(escalation).toMatchObject({ severity: "high", reason: "required_dimension_unsupported" });
  });

  it("never cites restricted evidence and blocks the cell with escalation", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-4",
      dimensions: [REVENUE],
      records: [evidence({ id: "ev-restricted", text: "Revenue detail.", sensitivity: "restricted" })],
      now: NOW,
    });

    expect(result.grid[0].status).toBe("blocked");
    expect(result.grid[0].citations).toHaveLength(0);
    expect(result.issueFlags[0].reason).toBe("restricted_sensitivity");
    expect(result.missingEvidence[0].reason).toBe("only_restricted");
    expect(result.reviewerEscalations[0]).toMatchObject({ reason: "blocked_evidence", recommendedReviewer: "data_owner" });
  });

  it("excludes ungoverned evidence from citations and flags its status", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-5",
      dimensions: [REVENUE],
      records: [evidence({ id: "ev-pending", text: "Revenue draft.", ingestionStatus: "pending_approval" })],
      now: NOW,
    });

    expect(result.grid[0].status).toBe("blocked");
    expect(result.grid[0].citations).toHaveLength(0);
    expect(result.issueFlags[0].reason).toBe("ungoverned_status");
    expect(result.missingEvidence[0].reason).toBe("only_ungoverned");
  });

  it("escalates sensitive regulatory content in cited evidence to a qualified reviewer", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-6",
      dimensions: [REVENUE],
      records: [
        evidence({ id: "ev-reg", text: "Revenue reported to the regulator in our supervisory filing." }),
      ],
      now: NOW,
    });

    const escalation = result.reviewerEscalations.find((e) => e.reason === "sensitive_content");
    expect(escalation).toMatchObject({ severity: "high", recommendedReviewer: "compliance_officer" });
  });

  it("flags missing provenance when a citation has no source URI", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-7",
      dimensions: [REVENUE],
      records: [evidence({ id: "ev-noprov", text: "Revenue 4.2M.", sourceUri: undefined })],
      now: NOW,
    });

    expect(result.issueFlags.map((f) => f.reason)).toContain("unverified_provenance");
    // Provenance gap alone does not block a high-confidence, fresh cell.
    expect(result.grid[0].status).toBe("supported");
  });

  it("keeps only the highest-confidence citations up to the cap", () => {
    const result = reviewEvidenceGrid({
      reviewId: "rev-8",
      dimensions: [REVENUE],
      records: [
        evidence({ id: "ev-a", text: "Revenue 1.", extractionConfidence: 0.7 }),
        evidence({ id: "ev-b", text: "Revenue 2.", extractionConfidence: 0.95 }),
        evidence({ id: "ev-c", text: "Revenue 3.", extractionConfidence: 0.8 }),
      ],
      now: NOW,
      options: { maxCitationsPerDimension: 2 },
    });

    expect(result.grid[0].citations.map((c) => c.evidenceId)).toEqual(["ev-b", "ev-c"]);
    expect(result.grid[0].coverageConfidence).toBeCloseTo(0.95);
  });

  it("emits started and completed audit events carrying the review summary", () => {
    const input = {
      reviewId: "rev-9",
      dimensions: [REVENUE],
      records: [evidence({ id: "ev-rev", text: "Revenue 4.2M." })],
    };
    const result = reviewEvidenceGrid({ ...input, now: NOW });
    const events = evidenceGridReviewAuditEvents(input, result);

    expect(events.map((e) => e.type)).toEqual([
      "native_skill.evidence_grid_review.started",
      "native_skill.evidence_grid_review.completed",
    ]);
    expect(events[0].payload).toMatchObject({ reviewId: "rev-9", dimensions: 1, candidateRecords: 1 });
    expect(events[1].payload).toMatchObject({ reviewId: "rev-9", supported: 1, approvalRequired: false });
  });
});
