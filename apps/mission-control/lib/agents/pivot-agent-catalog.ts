import { AGENT_LIBRARY, type NexusAgent } from "@/lib/agents/agent-library";
import {
  AGENT_SKILL_DEFINITIONS,
  AGENT_SKILL_FAMILY,
  AGENT_SKILL_FAMILY_LABELS,
  agentSkillFamilies,
  type AgentSkill,
  type AgentSkillFamily
} from "@/lib/agents/agent-skills";

export type PivotAgentSuiteId = "nexus" | "quorum" | "meridian" | "vantage" | "nucleus";

export type PivotAgentSuite = {
  id: PivotAgentSuiteId;
  name: string;
  productLine: string;
  description: string;
  agentIds: string[];
  requiredSkills: AgentSkill[];
  boundary: string;
};

export type PivotAgentCatalogIssue = {
  suiteId: PivotAgentSuiteId;
  agentId?: string;
  missingSkills?: AgentSkill[];
  reason: "unknown_agent" | "missing_required_skill";
};

export const PIVOT_AGENT_SUITES: PivotAgentSuite[] = [
  {
    id: "nexus",
    name: "Nexus Core",
    productLine: "Executive mission control",
    description: "Shared engine for evidence ingestion, governed agent briefs, synthesis, approvals, and decisions.",
    agentIds: [
      "strategy_agent",
      "risk_agent",
      "decision_agent",
      "execution_agent",
      "data_quality_agent",
      "ai_governance_agent"
    ],
    requiredSkills: ["browse sources", "review evidence", "analyze evidence", "draft memo"],
    boundary: "Nexus prepares source-backed briefs and decision packets; humans approve external action.",
  },
  {
    id: "quorum",
    name: "Quorum",
    productLine: "Board intelligence and governance workflow",
    description: "Agents for board packs, decision records, governance risks, obligations, and action follow-through.",
    agentIds: [
      "decision_agent",
      "regulatory_obligation_agent",
      "audit_findings_agent",
      "legal_exposure_agent",
      "risk_agent"
    ],
    requiredSkills: ["browse sources", "review approvals", "review compliance", "extract obligations", "draft memo"],
    boundary: "Quorum can prepare board records and packs; it cannot approve, sign, file, or finalize board action.",
  },
  {
    id: "meridian",
    name: "Meridian",
    productLine: "Regulatory submissions",
    description: "Agents for requirement coverage, evidence gaps, compliance caveats, and filing-pack preparation.",
    agentIds: [
      "regulatory_obligation_agent",
      "legal_exposure_agent",
      "audit_findings_agent",
      "ai_governance_agent",
      "risk_agent"
    ],
    requiredSkills: ["browse sources", "review compliance", "extract obligations", "prepare approval packet"],
    boundary: "Meridian may prepare a reviewable pack; qualified humans own legal interpretation and submission.",
  },
  {
    id: "vantage",
    name: "Vantage",
    productLine: "Due diligence copilot",
    description: "Agents for data-room review, coverage gaps, red flags, advisor judgment, and IC handoff.",
    agentIds: [
      "finance_signal_agent",
      "legal_exposure_agent",
      "technology_health_agent",
      "data_quality_agent",
      "people_signal_agent",
      "risk_agent",
      "decision_agent"
    ],
    requiredSkills: ["ingest sources", "browse sources", "review evidence", "extract risks", "draft memo"],
    boundary: "Vantage drafts diligence analysis and IC packs; the buyer or IC owns the investment decision.",
  },
  {
    id: "nucleus",
    name: "Nucleus",
    productLine: "AI operating model and workflow readiness",
    description: "Agents for process mapping, data quality, AI governance, blockers, and operating-model improvement.",
    agentIds: [
      "process_agent",
      "technology_health_agent",
      "data_quality_agent",
      "ai_governance_agent",
      "execution_agent"
    ],
    requiredSkills: ["browse sources", "review evidence", "analyze evidence", "compare documents", "draft recommendation"],
    boundary: "Nucleus can recommend operating-model changes; accountable leaders approve org or system changes.",
  },
];

export function agentsForPivotSuite(suiteId: PivotAgentSuiteId): NexusAgent[] {
  const suite = PIVOT_AGENT_SUITES.find((item) => item.id === suiteId);
  if (!suite) return [];
  return suite.agentIds.flatMap((agentId) => {
    const agent = AGENT_LIBRARY[agentId];
    return agent ? [agent] : [];
  });
}

export function skillFamiliesForSuite(suite: PivotAgentSuite): AgentSkillFamily[] {
  return Array.from(new Set(suite.requiredSkills.map((skill) => AGENT_SKILL_FAMILY[skill])));
}

export function validatePivotAgentCatalog(): PivotAgentCatalogIssue[] {
  return PIVOT_AGENT_SUITES.flatMap((suite) => {
    const suiteIssues: PivotAgentCatalogIssue[] = [];
    const suiteSkills = new Set<AgentSkill>();
    for (const agentId of suite.agentIds) {
      const agent = AGENT_LIBRARY[agentId];
      if (!agent) {
        suiteIssues.push({ suiteId: suite.id, agentId, reason: "unknown_agent" });
        continue;
      }
      agent.skillHints.forEach((skill) => suiteSkills.add(skill));
    }

    const missingSkills = suite.requiredSkills.filter((skill) => !suiteSkills.has(skill));
    if (missingSkills.length > 0) {
      suiteIssues.push({ suiteId: suite.id, missingSkills, reason: "missing_required_skill" });
    }
    return suiteIssues;
  });
}

export function buildAgentCatalog() {
  return {
    skillFamilies: Object.entries(AGENT_SKILL_FAMILY_LABELS).map(([id, label]) => ({ id, label })),
    skills: AGENT_SKILL_DEFINITIONS,
    agents: Object.values(AGENT_LIBRARY).map((agent) => ({
      ...agent,
      skillFamilies: agentSkillFamilies(agent.skillHints),
    })),
    pivotSuites: PIVOT_AGENT_SUITES.map((suite) => ({
      ...suite,
      skillFamilies: skillFamiliesForSuite(suite),
      agents: agentsForPivotSuite(suite.id).map((agent) => ({
        id: agent.id,
        name: agent.name,
        room: agent.room,
        approvalPolicy: agent.approvalPolicy,
        skillHints: agent.skillHints,
        skillFamilies: agentSkillFamilies(agent.skillHints),
      })),
    })),
    integrity: {
      issues: validatePivotAgentCatalog(),
    },
  };
}
