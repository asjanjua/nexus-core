import { describe, expect, it } from "vitest";
import { AGENT_LIBRARY } from "@/lib/agents/agent-library";
import {
  agentSkillFamilies,
  agentSupportsJobType,
  missingFamiliesForJob,
  normalizeAgentSkill
} from "@/lib/agents/agent-skills";
import { buildAgentCatalog, validatePivotAgentCatalog } from "@/lib/agents/pivot-agent-catalog";

describe("agent skill taxonomy", () => {
  it("normalizes only known skills", () => {
    expect(normalizeAgentSkill("browse sources")).toBe("browse sources");
    expect(normalizeAgentSkill("cerytain magic")).toBeNull();
  });

  it("requires all job families for explicit agent assignment", () => {
    expect(agentSupportsJobType(["search evidence"], "agent_brief")).toBe(false);
    expect(missingFamiliesForJob(["search evidence"], "agent_brief")).toEqual(["analyze"]);
    expect(agentSupportsJobType(["search evidence", "analyze evidence"], "agent_brief")).toBe(true);
  });

  it("gives every library agent the baseline browse, review, and analyze skills", () => {
    for (const agent of Object.values(AGENT_LIBRARY)) {
      expect(agentSkillFamilies(agent.skillHints)).toEqual(
        expect.arrayContaining(["browse", "review", "analyze"])
      );
    }
  });
});

describe("pivot agent catalog", () => {
  it("has complete Nexus and pivot suite coverage", () => {
    expect(validatePivotAgentCatalog()).toEqual([]);
  });

  it("exposes pivot suites with agent rosters and skill bundles", () => {
    const catalog = buildAgentCatalog();
    const suiteIds = catalog.pivotSuites.map((suite) => suite.id).sort();

    expect(suiteIds).toEqual(["meridian", "nexus", "nucleus", "quorum", "vantage"]);
    expect(catalog.pivotSuites.every((suite) => suite.agents.length > 0)).toBe(true);
    expect(catalog.pivotSuites.find((suite) => suite.id === "vantage")?.skillFamilies).toEqual(
      expect.arrayContaining(["ingest", "browse", "review", "analyze", "act"])
    );
  });
});
