import { describe, expect, it } from "vitest";
import type { AgentControlProfile, EvidenceRecord } from "@/lib/contracts";
import { buildDefaultAgentControlProfile } from "@/lib/agents/default-passports";
import { canReadEvidence, canUseTool, filterEvidenceByPassport } from "@/lib/agents/passport-policy";

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
});

