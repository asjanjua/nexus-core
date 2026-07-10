import { describe, expect, it } from "vitest";
import {
  actionRightSchema,
  agentOutputSchema,
  agentControlProfileSchema,
  evidenceRecordSchema,
  ingestionStatusSchema,
  recommendationStatusSchema
} from "@/lib/contracts";

const baseEvidence = {
  id: "ev-test",
  tenantId: "tenant-a",
  workspaceId: "workspace-a",
  sourceType: "document",
  connectorInstanceId: "conn-slack-demo",
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

  it("validates the agent control profile passport contract", () => {
    const parsed = agentControlProfileSchema.safeParse({
      id: "acp-test",
      workspaceId: "workspace-a",
      agentKey: "risk_agent",
      name: "Risk Agent",
      purpose: "Surface governed risks from approved evidence.",
      version: 1,
      status: "active",
      allowedScopes: ["risk", "audit"],
      forbiddenScopes: ["finance"],
      maxSensitivity: "confidential",
      crossEntityAccess: false,
      allowedTools: ["search evidence"],
      forbiddenTools: ["send_email"],
      policyControlledApis: {},
      actionRight: "prepare_for_approval",
      hardStops: ["send_email"],
      escalationTriggers: ["regulatory_commitment"],
      approvalLevel: "partner",
      riskRating: "regulated",
      reviewCadence: "per_output",
      watcherAgents: ["ai_governance_agent"],
      logLevel: "full",
      createdBy: "operator",
      createdAt: new Date().toISOString(),
      updatedBy: "operator",
      updatedAt: new Date().toISOString()
    });

    expect(parsed.success).toBe(true);
    expect(actionRightSchema.safeParse("send_email").success).toBe(false);
  });

  it("validates the U3 agent output contract", () => {
    const parsed = agentOutputSchema.safeParse({
      id: "out-test",
      workspaceId: "workspace-a",
      agentId: "risk_agent",
      agentVersion: 1,
      roleKey: "ceo",
      content: "Risk brief content.",
      inputSummary: "Prompt summary",
      evidenceRefs: ["ev-test"],
      confidence: 0.82,
      outputVersion: 1,
      isActive: true,
      replacedById: null,
      createdAt: new Date().toISOString()
    });

    expect(parsed.success).toBe(true);
  });
});
