import { describe, expect, it } from "vitest";
import { extractEntityCandidates } from "@/lib/services/entity-extraction";
import type { EvidenceRecord } from "@/lib/contracts";

function record(text: string): EvidenceRecord {
  return {
    id: "ev-entity-test",
    tenantId: "tenant-test",
    workspaceId: "workspace-test",
    sourceType: "document",
    sourcePath: "/uploads/board-pack.pdf",
    sourceTimestamp: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    hash: "sha256:test",
    sensitivity: "internal",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 1,
    department: "Risk & Compliance",
    text
  };
}

describe("entity extraction", () => {
  it("extracts risks, systems, amounts, dates, and named organizations", () => {
    const entities = extractEntityCandidates(record(
      "Gulf Capital Partners flagged margin compression risk in Q3 2026. " +
      "The SAP connector delay blocks KYC workflow review. " +
      "Revenue exposure is USD 4.2M and gross margin fell to 28%."
    ));

    expect(entities.some((e) => e.type === "organization" && e.name === "Gulf Capital Partners")).toBe(true);
    expect(entities.some((e) => e.type === "risk" && /margin compression risk/i.test(e.name))).toBe(true);
    expect(entities.some((e) => e.type === "system" && e.name === "SAP")).toBe(true);
    expect(entities.some((e) => e.type === "process" && /KYC workflow/i.test(e.name))).toBe(true);
    expect(entities.some((e) => e.type === "amount" && /USD 4.2M/i.test(e.name))).toBe(true);
    expect(entities.some((e) => e.type === "date" && e.name === "Q3 2026")).toBe(true);
  });

  it("links every extracted entity back to the source evidence", () => {
    const entities = extractEntityCandidates(record("Slack reported onboarding cycle time delay in Q1 2026."));

    expect(entities.length).toBeGreaterThan(0);
    expect(entities.every((entity) => entity.workspaceId === "workspace-test")).toBe(true);
    expect(entities.every((entity) => entity.evidenceId === "ev-entity-test")).toBe(true);
    expect(entities.every((entity) => entity.metadata.sourcePath === "/uploads/board-pack.pdf")).toBe(true);
  });
});
