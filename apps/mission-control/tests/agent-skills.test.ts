import { describe, expect, it } from "vitest";
import { AGENT_LIBRARY } from "@/lib/agents/agent-library";
import {
  agentSkillFamilies,
  agentSupportsJobType,
  missingFamiliesForJob,
  normalizeAgentSkill
} from "@/lib/agents/agent-skills";
import { buildAgentCatalog, validatePivotAgentCatalog } from "@/lib/agents/pivot-agent-catalog";
import {
  buildExternalSkillCandidateReview,
  rankedExternalSkillCandidates,
  validateExternalSkillCandidates
} from "@/lib/agents/external-skill-candidates";
import {
  buildNexusNativeSkillCatalog,
  NEXUS_NATIVE_SKILLS,
  validateNexusNativeSkills
} from "@/lib/agents/nexus-native-skills";
import {
  buildWorkflowSkillAnalysis,
  validateWorkflowSkillAnalysis
} from "@/lib/agents/workflow-skill-analysis";

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

describe("workflow skill analysis", () => {
  it("has clean workflow-to-skill coverage", () => {
    expect(validateWorkflowSkillAnalysis()).toEqual([]);
  });

  it("maps each major workflow to skills, agents, and concrete code paths", () => {
    const analysis = buildWorkflowSkillAnalysis();
    expect(analysis.workflows.length).toBeGreaterThanOrEqual(10);
    expect(analysis.workflows.every((workflow) => workflow.skills.length > 0)).toBe(true);
    expect(analysis.workflows.every((workflow) => workflow.agents.length > 0)).toBe(true);
    expect(analysis.workflows.every((workflow) => workflow.entrypoints.length > 0)).toBe(true);
    expect(analysis.workflows.find((workflow) => workflow.id === "workflow_twin_shadow")?.skillFamilies).toEqual(
      expect.arrayContaining(["browse", "review", "analyze", "act"])
    );
  });
});

describe("external skill shortlist tests", () => {
  it("keeps the fine-tooth shortlist internally consistent", () => {
    expect(validateExternalSkillCandidates()).toEqual([]);
  });

  it("ranks evidence grids and governance as the first patterns to adapt", () => {
    const candidates = rankedExternalSkillCandidates();

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "claude-for-legal-tabular-review",
      "awesome-copilot-agent-governance",
      "financial-services-private-equity",
      "knowledge-work-plugins-legal",
      "anthropic-document-skills",
      "kepano-obsidian-skills",
      "mcp-git-ingest",
      "browser-use",
    ]);
    expect(candidates[0]).toMatchObject({
      candidateType: "reference_only",
      license: "apache-2.0",
      mappedNexusSkills: expect.arrayContaining(["compare documents", "prepare approval packet"]),
      mappedWorkflows: expect.arrayContaining(["evidence_review", "pivot_delivery"]),
    });
  });

  it("does not mark any GitHub candidate as runtime-ready yet", () => {
    const review = buildExternalSkillCandidateReview();

    expect(review.integrity.issues).toEqual([]);
    expect(review.candidates.every((candidate) => candidate.candidateType !== "runtime_candidate")).toBe(true);
    expect(review.candidates.every((candidate) => candidate.runtimeBlockers.length > 0)).toBe(true);
  });

  it("keeps proprietary document skills non-installable and tool candidates sandbox-gated", () => {
    const candidates = rankedExternalSkillCandidates();
    const documentSkills = candidates.find((candidate) => candidate.id === "anthropic-document-skills");
    const toolCandidates = candidates.filter((candidate) => candidate.candidateType === "tool_candidate");

    expect(documentSkills).toMatchObject({
      candidateType: "reference_only",
      license: "source_available_proprietary",
      runtimeBlockers: expect.arrayContaining(["licenseClearance"]),
    });
    expect(toolCandidates.map((candidate) => candidate.id).sort()).toEqual(["browser-use", "mcp-git-ingest"]);
    expect(toolCandidates.every((candidate) => candidate.runtimeBlockers.some((blocker) => blocker.toLowerCase().includes("sandbox")))).toBe(true);
  });
});

describe("Nexus native skills", () => {
  it("keeps the first-party native skill catalog internally consistent", () => {
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("starts with the expected native skill pack", () => {
    expect(NEXUS_NATIVE_SKILLS.map((skill) => skill.id)).toEqual([
      "evidence_grid_review",
      "agent_governance_review",
      "vantage_diligence_analysis",
      "quorum_governance_review",
      "meridian_compliance_review",
      "document_integrity_review",
      "knowledge_workspace_synthesis",
    ]);
  });

  it("covers every pivot suite and major workflow", () => {
    const catalog = buildNexusNativeSkillCatalog();
    const coveredSuites = new Set(catalog.skills.flatMap((skill) => skill.pivotSuiteIds));
    const coveredWorkflows = new Set(catalog.skills.flatMap((skill) => skill.mappedWorkflows));
    const workflowAnalysis = buildWorkflowSkillAnalysis();

    expect([...coveredSuites].sort()).toEqual(["meridian", "nexus", "nucleus", "quorum", "vantage"]);
    expect([...coveredWorkflows].sort()).toEqual(
      workflowAnalysis.workflows.map((workflow) => workflow.id).sort()
    );
  });

  it("anchors evidence grid review across shared evidence and pivot delivery", () => {
    const evidenceGrid = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "evidence_grid_review");

    expect(evidenceGrid).toMatchObject({
      family: "review",
      approvalRequired: true,
      runtimeStatus: "runtime_ready",
      externalReferences: [],
      mappedWorkflows: expect.arrayContaining(["evidence_review", "pivot_delivery"]),
      pivotSuiteIds: expect.arrayContaining(["nexus", "quorum", "meridian", "vantage", "nucleus"]),
      mappedAgentSkills: expect.arrayContaining(["review evidence", "compare documents", "prepare approval packet"]),
    });
  });

  it("promotes evidence grid review to a first-party runtime with no external dependency", () => {
    const evidenceGrid = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "evidence_grid_review");

    expect(evidenceGrid?.runtimeStatus).toBe("runtime_ready");
    expect(evidenceGrid?.externalReferences).toEqual([]);
    // The runtime_ready + no-external-reference invariant must stay green.
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("promotes document integrity review to a first-party runtime with no external dependency", () => {
    const integrity = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "document_integrity_review");

    expect(integrity?.runtimeStatus).toBe("runtime_ready");
    expect(integrity?.externalReferences).toEqual([]);
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("promotes vantage diligence analysis to a first-party runtime with no external dependency", () => {
    const vantage = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "vantage_diligence_analysis");

    expect(vantage?.runtimeStatus).toBe("runtime_ready");
    expect(vantage?.externalReferences).toEqual([]);
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("promotes quorum governance review to a first-party runtime with no external dependency", () => {
    const quorum = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "quorum_governance_review");

    expect(quorum?.runtimeStatus).toBe("runtime_ready");
    expect(quorum?.externalReferences).toEqual([]);
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("promotes meridian compliance review to a first-party runtime with no external dependency", () => {
    const meridian = NEXUS_NATIVE_SKILLS.find((skill) => skill.id === "meridian_compliance_review");

    expect(meridian?.runtimeStatus).toBe("runtime_ready");
    expect(meridian?.externalReferences).toEqual([]);
    expect(validateNexusNativeSkills()).toEqual([]);
  });

  it("requires review and action-capable native skills to be approval-gated and auditable", () => {
    const highImpactSkills = NEXUS_NATIVE_SKILLS.filter(
      (skill) => skill.family === "review" || skill.mappedAgentSkills.some((mappedSkill) => mappedSkill.startsWith("draft") || mappedSkill === "prepare approval packet")
    );

    expect(highImpactSkills.length).toBeGreaterThan(0);
    expect(highImpactSkills.every((skill) => skill.approvalRequired)).toBe(true);
    expect(NEXUS_NATIVE_SKILLS.every((skill) => skill.auditEvents.length >= 2)).toBe(true);
  });

  it("does not treat reference-informed native skills as external runtime installs", () => {
    const catalog = buildNexusNativeSkillCatalog();

    expect(catalog.integrity.issues).toEqual([]);
    expect(catalog.skills.every((skill) => skill.runtimeStatus !== "runtime_ready" || skill.externalReferences.length === 0)).toBe(true);
    expect(catalog.skills.every((skill) => !("sourceUrl" in skill))).toBe(true);
  });
});
