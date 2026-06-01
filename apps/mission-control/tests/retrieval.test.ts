import { describe, expect, it } from "vitest";
import { answerWithEvidence } from "@/lib/services/retrieval";
import { repository } from "@/lib/data/repository";

describe("ask retrieval", () => {
  it("returns evidence-backed answer for risk query", async () => {
    const response = await answerWithEvidence("top risks pricing", "workspace-demo");
    expect(response.refused).toBe(false);
    expect(response.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("refuses when evidence is weak", async () => {
    const response = await answerWithEvidence("unknown-unmatched-topic-zzz", "workspace-demo");
    expect(response.refused).toBe(true);
    expect(response.refusalReason).toBe("insufficient_evidence");
  });

  it("applies agent passport filtering before Ask synthesis", async () => {
    const response = await answerWithEvidence("top risks pricing", "workspace-demo", {
      agentKey: "strategy_agent"
    });
    expect(response.refused).toBe(true);
    expect(response.refusalReason).toBe("passport_denied_evidence");
    expect(response.evidenceRefs).toEqual([]);
  });

  it("refuses suspended agents before producing Ask output", async () => {
    const workspaceId = `workspace-suspended-${Date.now()}`;
    const agentKey = `suspended_agent_${Math.random().toString(36).slice(2, 7)}`;
    await repository.createAgentControlProfileVersion({
      workspaceId,
      agentKey,
      name: "Suspended Test Agent",
      purpose: "Validate suspended agents cannot run Ask.",
      status: "active",
      allowedScopes: ["risk"],
      forbiddenScopes: [],
      maxSensitivity: "internal",
      crossEntityAccess: false,
      allowedTools: ["draft memo"],
      forbiddenTools: [],
      policyControlledApis: {},
      actionRight: "draft",
      hardStops: ["send_email"],
      escalationTriggers: ["regulatory_commitment"],
      approvalLevel: "owner",
      riskRating: "medium",
      reviewCadence: "weekly",
      watcherAgents: ["audit_agent"],
      logLevel: "actions",
      createdBy: "test-runner"
    });
    await repository.suspendAgentControlProfile(workspaceId, agentKey, "test-runner");

    const response = await answerWithEvidence("top risks", workspaceId, { agentKey });
    expect(response.refused).toBe(true);
    expect(response.refusalReason).toBe("agent_not_active");
    expect(response.evidenceRefs).toEqual([]);
  });
});
