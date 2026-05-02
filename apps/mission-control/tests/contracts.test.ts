import { describe, expect, it } from "vitest";
import { evidenceRecordSchema, ingestionStatusSchema, recommendationStatusSchema } from "@/lib/contracts";

const baseEvidence = {
  id: "ev-test",
  tenantId: "tenant-a",
  workspaceId: "workspace-a",
  sourceType: "document",
  sourcePath: "/tmp/a.pdf",
  sourceTimestamp: new Date().toISOString(),
  ingestedAt: new Date().toISOString(),
  hash: "sha256:test",
  sensitivity: "internal",
  freshnessHours: 2,
  text: "hello"
};

describe("contracts", () => {
  it("validates evidence with processed status", () => {
    const parsed = evidenceRecordSchema.safeParse({
      ...baseEvidence,
      extractionConfidence: 0.85,
      ingestionStatus: "processed"
    });
    expect(parsed.success).toBe(true);
  });

  it("validates evidence with pending_approval status", () => {
    const parsed = evidenceRecordSchema.safeParse({
      ...baseEvidence,
      extractionConfidence: 0.55,
      ingestionStatus: "pending_approval"
    });
    expect(parsed.success).toBe(true);
  });

  it("validates evidence with quarantined status", () => {
    const parsed = evidenceRecordSchema.safeParse({
      ...baseEvidence,
      extractionConfidence: 0.20,
      ingestionStatus: "quarantined"
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown ingestion status values", () => {
    expect(ingestionStatusSchema.safeParse("approved_by_magic").success).toBe(false);
    expect(ingestionStatusSchema.safeParse("").success).toBe(false);
  });

  it("accepts all valid ingestion status values", () => {
    const valid = ["queued", "triaged", "pending_approval", "quarantined", "processed", "failed"];
    valid.forEach((status) => {
      expect(ingestionStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it("guards recommendation enum values", () => {
    expect(recommendationStatusSchema.safeParse("approved").success).toBe(true);
    expect(recommendationStatusSchema.safeParse("invalid_status").success).toBe(false);
  });
});

