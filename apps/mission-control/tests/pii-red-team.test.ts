/**
 * PII / restricted-evidence red-team (BACKLOG P1).
 *
 * Adversarial check on the governance gate that decides whether a piece of
 * evidence may enter an agent's LLM context. The product promise to regulated
 * buyers is: restricted or PII-bearing evidence is never silently fed to a model.
 *
 * This suite uploads fictitious PII/restricted records and asserts the real
 * `canReadEvidence` / `filterEvidenceByPassport` gate denies them with the right
 * reason, while still allowing in-ceiling, in-scope evidence (so the gate is not
 * trivially "deny everything"). It also pins the fail-closed behaviors:
 * missing sensitivity and a suspended passport both deny.
 */

import { describe, expect, it } from "vitest";
import { canReadEvidence, filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import { agentControlProfileSchema, type AgentControlProfile, type EvidenceRecord, type Sensitivity } from "@/lib/contracts";

function passport(overrides: Partial<AgentControlProfile> = {}): AgentControlProfile {
  const now = new Date().toISOString();
  return agentControlProfileSchema.parse({
    id: "ap-1",
    workspaceId: "ws-1",
    agentKey: "ceo-analyst",
    name: "CEO Analyst",
    purpose: "Synthesize executive briefs from governed evidence.",
    version: 1,
    status: "active",
    allowedScopes: ["txt", "finance", "board"],
    forbiddenScopes: [],
    maxSensitivity: "confidential",
    allowedTools: [],
    forbiddenTools: [],
    actionRight: "summarize",
    approvalLevel: "owner",
    riskRating: "medium",
    reviewCadence: "weekly",
    logLevel: "actions_sources",
    createdBy: "tester",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function evidence(overrides: Partial<EvidenceRecord> & { sensitivity: Sensitivity }): EvidenceRecord {
  const now = new Date().toISOString();
  return {
    id: "ev-1",
    tenantId: "ws-1",
    workspaceId: "ws-1",
    sourceType: "txt",
    sourcePath: "/board/finance-summary.txt",
    sourceTimestamp: now,
    ingestedAt: now,
    hash: "h1",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 1,
    text: "redacted",
    ...overrides,
  };
}

describe("PII red-team: restricted evidence is denied", () => {
  it("restricted record (e.g. raw customer PII) exceeds a confidential ceiling", () => {
    const rec = evidence({
      sensitivity: "restricted",
      sourcePath: "/exports/customer-ssn-dump.csv",
      text: "Name: Jane Roe, SSN 123-45-6789, IBAN GB29 NWBK 6016 1331 9268 19",
    });
    const decision = canReadEvidence(rec, passport({ maxSensitivity: "confidential" }));
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("sensitivity_exceeds_passport_ceiling");
  });

  it("confidential record is denied for an internal-ceiling passport", () => {
    const rec = evidence({ sensitivity: "confidential" });
    const decision = canReadEvidence(rec, passport({ maxSensitivity: "internal" }));
    expect(decision.allowed).toBe(false);
  });
});

describe("PII red-team: fail-closed defaults", () => {
  it("missing/empty sensitivity is treated as restricted and denied", () => {
    // Force the missing-sensitivity branch the way malformed ingestion could.
    const rec = { ...evidence({ sensitivity: "internal" }), sensitivity: undefined } as unknown as EvidenceRecord;
    const decision = canReadEvidence(rec, passport());
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("missing_sensitivity_treated_as_restricted");
  });

  it("a suspended passport cannot read even public evidence", () => {
    const rec = evidence({ sensitivity: "public" });
    const decision = canReadEvidence(rec, passport({ status: "suspended" }));
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("agent_not_active");
  });

  it("an explicitly forbidden scope is denied even within the sensitivity ceiling", () => {
    const rec = evidence({ sensitivity: "internal", sourcePath: "/hr/salaries.txt", department: "hr" });
    const decision = canReadEvidence(rec, passport({ forbiddenScopes: ["hr"], allowedScopes: ["txt", "hr"] }));
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("forbidden_scope");
  });
});

describe("PII red-team: the gate is not trivially deny-all", () => {
  it("in-ceiling, in-scope evidence is allowed (control case)", () => {
    const rec = evidence({ sensitivity: "internal", sourcePath: "/board/finance-summary.txt" });
    const decision = canReadEvidence(rec, passport());
    expect(decision.allowed).toBe(true);
  });

  it("filterEvidenceByPassport separates a mixed batch correctly and records reasons", () => {
    const batch: EvidenceRecord[] = [
      evidence({ id: "ok", sensitivity: "internal", sourcePath: "/board/ok.txt" }),
      evidence({ id: "pii", sensitivity: "restricted", sourcePath: "/exports/pii.csv" }),
      evidence({ id: "conf", sensitivity: "confidential", sourcePath: "/board/conf.txt" }),
    ];
    const { allowed, denied } = filterEvidenceByPassport(batch, passport({ maxSensitivity: "internal" }));
    expect(allowed.map((r) => r.id)).toEqual(["ok"]);
    expect(denied.map((d) => d.record.id).sort()).toEqual(["conf", "pii"]);
    expect(denied.every((d) => typeof d.reason === "string" && d.reason.length > 0)).toBe(true);
  });
});
