import type { DispatchJobType } from "@/lib/contracts";

export const AGENT_SKILLS = [
  "ingest sources",
  "read documents",
  "read spreadsheets",
  "read contracts",
  "browse sources",
  "search evidence",
  "search memory",
  "search audit",
  "review evidence",
  "review approvals",
  "review compliance",
  "summarize",
  "analyze evidence",
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

export type AgentSkillFamily = "ingest" | "browse" | "review" | "analyze" | "act";

export type AgentSkillDefinition = {
  skill: AgentSkill;
  family: AgentSkillFamily;
  label: string;
  description: string;
};

export const AGENT_SKILL_FAMILY_LABELS: Record<AgentSkillFamily, string> = {
  ingest: "Ingest",
  browse: "Browse",
  review: "Review",
  analyze: "Analyze",
  act: "Act",
};

export const AGENT_SKILL_FAMILY: Record<AgentSkill, AgentSkillFamily> = {
  "ingest sources": "ingest",
  "read documents": "ingest",
  "read spreadsheets": "ingest",
  "read contracts": "ingest",
  "browse sources": "browse",
  "search evidence": "browse",
  "search memory": "browse",
  "search audit": "browse",
  "review evidence": "review",
  "review approvals": "review",
  "review compliance": "review",
  summarize: "analyze",
  "analyze evidence": "analyze",
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
  "ingest sources": ["upload", "document", "google_drive", "sharepoint", "email_crm", "jira", "github"],
  "read documents": ["pdf", "docx", "pptx", "txt", "md", "slack"],
  "read spreadsheets": ["xlsx", "csv", "finance_export", "social_export"],
  "read contracts": ["pdf", "docx", "contract"],
  "browse sources": ["upload", "document", "google_drive", "sharepoint", "email_crm", "jira", "github", "crm"],
  "summarize social exports": ["social_export", "csv", "xlsx"],
  "summarize exports": ["csv", "xlsx", "finance_export", "social_export"],
  "compare spreadsheets": ["xlsx", "csv", "finance_export"],
  "compare campaigns": ["social_export", "ad_export", "csv", "xlsx"],
};

const JOB_REQUIRED_FAMILIES: Record<DispatchJobType, AgentSkillFamily[]> = {
  agent_brief: ["browse", "analyze"],
  synthesis: ["browse", "analyze"],
  workflow_run: ["browse", "review", "analyze"],
  decision_extract: ["browse", "analyze"],
};

export const AGENT_SKILL_DEFINITIONS: AgentSkillDefinition[] = AGENT_SKILLS.map((skill) => ({
  skill,
  family: AGENT_SKILL_FAMILY[skill],
  label: skill,
  description: descriptionForSkill(skill),
}));

function descriptionForSkill(skill: AgentSkill): string {
  switch (AGENT_SKILL_FAMILY[skill]) {
    case "ingest":
      return "Bring source material into governed evidence or read a source format safely.";
    case "browse":
      return "Find and traverse approved evidence, memory, audit logs, or connected source records.";
    case "review":
      return "Check evidence, approvals, compliance posture, caveats, and human-control boundaries.";
    case "analyze":
      return "Extract, compare, summarize, quantify, or reason over approved evidence.";
    case "act":
      return "Draft controlled outputs or prepare human-owned follow-up packets.";
  }
}

export function normalizeAgentSkill(value: string): AgentSkill | null {
  return (AGENT_SKILLS as readonly string[]).includes(value) ? (value as AgentSkill) : null;
}

export function agentSkillsForHints(skillHints: readonly string[]): AgentSkill[] {
  return skillHints.flatMap((hint) => {
    const skill = normalizeAgentSkill(hint);
    return skill ? [skill] : [];
  });
}

export function agentSkillFamilies(skillHints: readonly string[]): AgentSkillFamily[] {
  return Array.from(new Set(agentSkillsForHints(skillHints).map((skill) => AGENT_SKILL_FAMILY[skill])));
}

export function missingFamiliesForJob(skillHints: readonly string[], jobType: DispatchJobType): AgentSkillFamily[] {
  const families = new Set(agentSkillFamilies(skillHints));
  return requiredFamiliesForJob(jobType).filter((family) => !families.has(family));
}

export function agentSupportsJobType(skillHints: readonly string[], jobType: DispatchJobType): boolean {
  return missingFamiliesForJob(skillHints, jobType).length === 0;
}

export function requiredFamiliesForJob(jobType: DispatchJobType): AgentSkillFamily[] {
  return JOB_REQUIRED_FAMILIES[jobType];
}
