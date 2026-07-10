import { describe, expect, it } from "vitest";
import type { AgentControlProfile, EvidenceRecord } from "@/lib/contracts";
import { buildDefaultAgentControlProfile } from "@/lib/agents/default-passports";
import { canReadEvidence, canUseTool, filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import { evaluateOutputGate } from "@/lib/agents/output-gate";
import { guardToolInvocation } from "@/lib/agents/tool-guard";
import { repository } from "@/lib/data/repository";

const baseEvidence: EvidenceRecord = {
  id: "ev-passport",
  tenantId: "tenant-a",
  workspaceId: "workspace-a",
  sourceType: "audit",
  department: "Risk & Compliance",
  sourcePath: "/risk/audit-findings.pdf",
  sourceTimestamp: new Date().toISOString(),
  ingestedAt: new Date().toISOString(),
  hash: "sha256:passport",
  sensitivity: "confidential",
  extractionConfidence: 0.9,
  ingestionStatus: "processed",
  freshnessHours: 1,
  text: "Audit finding with remediation owner."
};

function profile(patch: Partial<AgentControlProfile> = {}): AgentControlProfile {
  const base = buildDefaultAgentControlProfile("workspace-a", "risk_agent", "test");
  if (!base) throw new Error("missing default passport");
  return { ...base, ...patch };
}

describe("agent passport policy", () => {
  it("allows evidence inside scope and sensitivity ceiling", () => {
    const decision = canReadEvidence(baseEvidence, profile());
    expect(decision.allowed).toBe(true);
  });

  it("denies evidence above sensitivity ceiling", () => {
    const decision = canReadEvidence(
      { ...baseEvidence, sensitivity: "restricted" },
      profile({ maxSensitivity: "confidential" })
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("sensitivity_exceeds_passport_ceiling");
  });

  it("explicit deny overrides allowed scope", () => {
    const decision = canReadEvidence(baseEvidence, profile({ forbiddenScopes: ["audit"] }));
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("forbidden_scope");
  });

  it("filters denied evidence before model context assembly", () => {
    const records = [
      baseEvidence,
      { ...baseEvidence, id: "ev-finance", department: "Finance", sourcePath: "/finance/budget.xlsx" }
    ];
    const result = filterEvidenceByPassport(records, profile({ forbiddenScopes: ["finance"] }));
    expect(result.allowed.map((record) => record.id)).toEqual(["ev-passport"]);
    expect(result.denied[0]?.reason).toBe("forbidden_scope");
  });

  it("blocks hard-stop tool actions independently of prompt text", () => {
    const decision = canUseTool("send_email", profile({ allowedTools: ["send_email"] }), "prepare_for_approval");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("forbidden_tool");
  });

  it("blocks actions above the passport right", () => {
    const decision = canUseTool("draft memo", profile({ allowedTools: ["draft memo"], actionRight: "draft" }), "recommend");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("action_right_exceeded");
  });

  it("routes regulatory interpretations to human review", () => {
    const decision = evaluateOutputGate(
      "This regulatory response should state compliance with the filing requirement.",
      profile({ actionRight: "prepare_for_approval" }),
      "prepare_for_approval"
    );
    expect(decision.allowed).toBe(true);
    expect(decision.escalationRequired).toBe(true);
    if (decision.escalationRequired) expect(decision.reason).toBe("regulatory_commitment");
  });

  it("blocks output that implies a hard-stop external send", () => {
    const decision = evaluateOutputGate(
      "Send this email to the client confirming the commercial terms.",
      profile({ actionRight: "prepare_for_approval", allowedTools: ["draft memo"] }),
      "prepare_for_approval"
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toContain("hard_stop:send_email");
  });

  it("audits denied tool invocations", async () => {
    const decision = await guardToolInvocation(
      "workspace-a",
      profile({ allowedTools: ["draft memo"] }),
      "send_email",
      "prepare_for_approval",
      "test-runner"
    );
    expect(decision.allowed).toBe(false);
    const events = await repository.getAuditEvents("workspace-a", 10);
    expect(events.some((event) => event.type === "agent_tool_denied")).toBe(true);
  });

  it("creates new passport versions without deleting history", async () => {
    const workspaceId = `workspace-version-${Date.now()}`;
    const agentKey = `versioned_agent_${Math.random().toString(36).slice(2, 7)}`;
    const input = {
      workspaceId,
      agentKey,
      name: "Versioned Test Agent",
      purpose: "Validate U2 passport version history.",
      status: "active" as const,
      allowedScopes: ["risk"],
      forbiddenScopes: [],
      maxSensitivity: "internal" as const,
      crossEntityAccess: false,
      allowedTools: ["draft memo"],
      forbiddenTools: [],
      policyControlledApis: {},
      actionRight: "draft" as const,
      hardStops: ["send_email"],
      escalationTriggers: ["regulatory_commitment"],
      approvalLevel: "owner" as const,
      riskRating: "medium" as const,
      reviewCadence: "weekly" as const,
      watcherAgents: ["audit_agent"],
      logLevel: "actions" as const,
      createdBy: "test-runner"
    };

    const first = await repository.createAgentControlProfileVersion(input);
    const second = await repository.createAgentControlProfileVersion({
      ...input,
      maxSensitivity: "confidential",
      updatedBy: "test-runner"
    });
    const history = await repository.getAgentControlProfileHistory(workspaceId, agentKey);

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(history.map((item) => item.version)).toEqual([2, 1]);
    expect(history[1]?.maxSensitivity).toBe("internal");
  });
});
