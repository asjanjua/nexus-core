import { describe, it, expect } from "vitest";
import { enforceAgentControlProfile } from "@/lib/agents/profile-enforcement";
import type { AgentControlProfile } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Helpers — minimal valid profile
// ---------------------------------------------------------------------------

function activeProfile(overrides: Partial<AgentControlProfile> = {}): AgentControlProfile {
  return {
    id: "acp-1",
    workspaceId: "ws-1",
    agentKey: "executive-synthesis",
    name: "Executive Synthesis Agent",
    purpose: "Summarize evidence for C-suite",
    version: 1,
    status: "active",
    allowedScopes: [],
    forbiddenScopes: [],
    maxSensitivity: "internal",
    crossEntityAccess: false,
    allowedTools: [],
    forbiddenTools: [],
    policyControlledApis: {},
    actionRight: "summarize",
    hardStops: [],
    escalationTriggers: [],
    approvalLevel: "owner",
    riskRating: "low",
    reviewCadence: "weekly",
    watcherAgents: [],
    logLevel: "actions",
    createdBy: "test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function evidence(id: string, sensitivity: "public" | "internal" | "confidential" | "restricted", scopes?: string[]) {
  return { id, sensitivity, scopes };
}

// ---------------------------------------------------------------------------
// Gate 0: Profile status
// ---------------------------------------------------------------------------

describe("enforceAgentControlProfile — status gates", () => {
  it("blocks all evidence when profile is suspended", () => {
    const profile = activeProfile({ status: "suspended" });
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "retrieve");
    expect(result.allowed).toEqual([]);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("profile_suspended");
  });

  it("blocks all evidence when profile is draft", () => {
    const profile = activeProfile({ status: "draft" });
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "retrieve");
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("profile_not_active");
  });

  it("allows evidence through when profile is active", () => {
    const profile = activeProfile();
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "retrieve");
    expect(result.allowed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gate 1: Action right
// ---------------------------------------------------------------------------

describe("enforceAgentControlProfile — action right", () => {
  it("allows retrieval when profile allows summarize (higher right)", () => {
    const profile = activeProfile({ actionRight: "summarize" });
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "retrieve");
    expect(result.allowed).toHaveLength(1);
  });

  it("blocks recommendation when profile only allows retrieve", () => {
    const profile = activeProfile({ actionRight: "retrieve" });
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "recommend");
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("action_right_insufficient");
  });

  it("allows prepare_for_approval when profile allows it", () => {
    const profile = activeProfile({ actionRight: "prepare_for_approval" });
    const result = enforceAgentControlProfile([evidence("e1", "public")], profile, "prepare_for_approval");
    expect(result.allowed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gate 2: Sensitivity ceiling
// ---------------------------------------------------------------------------

describe("enforceAgentControlProfile — sensitivity ceiling", () => {
  it("allows evidence at or below profile max sensitivity", () => {
    const profile = activeProfile({ maxSensitivity: "internal" });
    const result = enforceAgentControlProfile(
      [evidence("e1", "public"), evidence("e2", "internal")],
      profile,
      "retrieve",
    );
    expect(result.allowed).toHaveLength(2);
  });

  it("blocks evidence above profile max sensitivity", () => {
    const profile = activeProfile({ maxSensitivity: "internal" });
    const result = enforceAgentControlProfile([evidence("e1", "confidential")], profile, "retrieve");
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("sensitivity_exceeds_max");
  });

  it("blocks restricted evidence when profile max is internal", () => {
    const profile = activeProfile({ maxSensitivity: "internal" });
    const result = enforceAgentControlProfile(
      [evidence("e1", "public"), evidence("e2", "restricted"), evidence("e3", "internal")],
      profile,
      "retrieve",
    );
    expect(result.allowed).toHaveLength(2);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].id).toBe("e2");
  });
});

// ---------------------------------------------------------------------------
// Gate 3-4: Scope enforcement
// ---------------------------------------------------------------------------

describe("enforceAgentControlProfile — scope enforcement", () => {
  it("allows unscoped evidence when allowedScopes is set", () => {
    // Unscoped evidence passes allowedScopes gate — intentional:
    // records without department tags are treated as workspace-global.
    const profile = activeProfile({ allowedScopes: ["finance"] });
    const result = enforceAgentControlProfile([evidence("e1", "internal")], profile, "retrieve");
    expect(result.allowed).toHaveLength(1);
  });

  it("blocks evidence whose scopes are not in allowedScopes", () => {
    const profile = activeProfile({ allowedScopes: ["finance"] });
    const result = enforceAgentControlProfile(
      [evidence("e1", "internal", ["operations"])],
      profile,
      "retrieve",
    );
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("scope_not_allowed");
  });

  it("allows evidence with matching scope in allowedScopes", () => {
    const profile = activeProfile({ allowedScopes: ["finance", "legal"] });
    const result = enforceAgentControlProfile(
      [evidence("e1", "internal", ["legal"])],
      profile,
      "retrieve",
    );
    expect(result.allowed).toHaveLength(1);
  });

  it("blocks evidence with forbidden scope", () => {
    const profile = activeProfile({ forbiddenScopes: ["hr"] });
    const result = enforceAgentControlProfile(
      [evidence("e1", "internal", ["finance", "hr"])],
      profile,
      "retrieve",
    );
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].reason).toBe("scope_forbidden");
  });

  it("allowedScopes and forbiddenScopes both empty — all evidence passes", () => {
    const profile = activeProfile();
    const result = enforceAgentControlProfile(
      [evidence("e1", "confidential", ["anything"])],
      profile,
      "retrieve",
    );
    // sensitivity blocks it, not scope
    expect(result.blocked[0].reason).toBe("sensitivity_exceeds_max");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("enforceAgentControlProfile — edge cases", () => {
  it("returns empty allowed when all evidence blocked", () => {
    const profile = activeProfile({ status: "suspended" });
    const result = enforceAgentControlProfile(
      [evidence("e1", "public"), evidence("e2", "internal")],
      profile,
      "retrieve",
    );
    expect(result.allowed).toEqual([]);
    expect(result.blocked).toHaveLength(2);
  });

  it("handles empty evidence array", () => {
    const profile = activeProfile();
    const result = enforceAgentControlProfile([], profile, "retrieve");
    expect(result.allowed).toEqual([]);
    expect(result.blocked).toEqual([]);
  });

  it("partially allows mixed evidence", () => {
    const profile = activeProfile({ maxSensitivity: "internal" });
    const result = enforceAgentControlProfile(
      [evidence("e1", "public"), evidence("e2", "restricted"), evidence("e3", "internal")],
      profile,
      "retrieve",
    );
    expect(result.allowed).toHaveLength(2);
    expect(result.blocked).toHaveLength(1);
  });
});
