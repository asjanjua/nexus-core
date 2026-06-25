import type { DispatchJobType } from "@/lib/contracts";

export const AGENT_SKILLS = [
  "read documents",
  "read spreadsheets",
  "read contracts",
  "search evidence",
  "search memory",
  "search audit",
  "summarize",
  "summarize variance",
  "summarize feedback",
  "summarize social exports",
  "summarize exports",
  "extract action items",
  "extract risks",
  "extract obligations",
  "extract metadata",
  "extract themes",
  "extract blockers",
  "compare documents",
  "compare decisions",
  "compare spreadsheets",
  "compare campaigns",
  "compare plans",
  "compare roadmap",
  "draft memo",
  "draft recommendation",
  "prepare approval packet",
  "create task",
  "send Slack update",
] as const;

export type AgentSkill = (typeof AGENT_SKILLS)[number];

export type AgentSkillFamily = "ingest_read" | "retrieve" | "analyze" | "act";

export const AGENT_SKILL_FAMILY: Record<AgentSkill, AgentSkillFamily> = {
  "read documents": "ingest_read",
  "read spreadsheets": "ingest_read",
  "read contracts": "ingest_read",
  "search evidence": "retrieve",
  "search memory": "retrieve",
  "search audit": "retrieve",
  summarize: "analyze",
  "summarize variance": "analyze",
  "summarize feedback": "analyze",
  "summarize social exports": "analyze",
  "summarize exports": "analyze",
  "extract action items": "analyze",
  "extract risks": "analyze",
  "extract obligations": "analyze",
  "extract metadata": "analyze",
  "extract themes": "analyze",
  "extract blockers": "analyze",
  "compare documents": "analyze",
  "compare decisions": "analyze",
  "compare spreadsheets": "analyze",
  "compare campaigns": "analyze",
  "compare plans": "analyze",
  "compare roadmap": "analyze",
  "draft memo": "act",
  "draft recommendation": "act",
  "prepare approval packet": "act",
  "create task": "act",
  "send Slack update": "act",
};

export const AGENT_SKILL_SOURCE_TYPES: Partial<Record<AgentSkill, string[]>> = {
  "read documents": ["pdf", "docx", "pptx", "txt", "md", "slack"],
  "read spreadsheets": ["xlsx", "csv", "finance_export", "social_export"],
  "read contracts": ["pdf", "docx", "contract"],
  "summarize social exports": ["social_export", "csv", "xlsx"],
  "summarize exports": ["csv", "xlsx", "finance_export", "social_export"],
  "compare spreadsheets": ["xlsx", "csv", "finance_export"],
  "compare campaigns": ["social_export", "ad_export", "csv", "xlsx"],
};

const JOB_REQUIRED_FAMILIES: Record<DispatchJobType, AgentSkillFamily[]> = {
  agent_brief: ["retrieve", "analyze", "act"],
  synthesis: ["retrieve", "analyze"],
  workflow_run: ["retrieve", "analyze", "act"],
  decision_extract: ["retrieve", "analyze", "act"],
};

export function normalizeAgentSkill(value: string): AgentSkill | null {
  return (AGENT_SKILLS as readonly string[]).includes(value) ? (value as AgentSkill) : null;
}

export function agentSkillsForHints(skillHints: readonly string[]): AgentSkill[] {
  return skillHints.flatMap((hint) => {
    const skill = normalizeAgentSkill(hint);
    return skill ? [skill] : [];
  });
}

export function agentSupportsJobType(skillHints: readonly string[], jobType: DispatchJobType): boolean {
  const requiredFamilies = JOB_REQUIRED_FAMILIES[jobType];
  const families = new Set(agentSkillsForHints(skillHints).map((skill) => AGENT_SKILL_FAMILY[skill]));
  return requiredFamilies.some((family) => families.has(family));
}

export function requiredFamiliesForJob(jobType: DispatchJobType): AgentSkillFamily[] {
  return JOB_REQUIRED_FAMILIES[jobType];
}
