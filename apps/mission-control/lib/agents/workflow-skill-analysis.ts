import { AGENT_LIBRARY, type NexusAgent } from "@/lib/agents/agent-library";
import { PIVOT_AGENT_SUITES, type PivotAgentSuiteId } from "@/lib/agents/pivot-agent-catalog";
import {
  AGENT_SKILL_FAMILY,
  normalizeAgentSkill,
  type AgentSkill,
  type AgentSkillFamily
} from "@/lib/agents/agent-skills";

export type NexusWorkflowId =
  | "onboarding_evidence_intake"
  | "connector_ingestion"
  | "evidence_review"
  | "agent_room_briefs"
  | "executive_synthesis"
  | "ask_retrieval"
  | "knowledge_workspace"
  | "decision_action_capture"
  | "recommendation_approval"
  | "workflow_twin_shadow"
  | "agent_governance"
  | "pivot_delivery";

export type NexusWorkflowSkillAnalysis = {
  id: NexusWorkflowId;
  name: string;
  status: "live" | "partial" | "planned";
  purpose: string;
  entrypoints: string[];
  services: string[];
  dataObjects: string[];
  agentIds: string[];
  pivotSuiteIds: PivotAgentSuiteId[];
  skills: AgentSkill[];
};

export type WorkflowSkillAnalysisIssue = {
  workflowId: NexusWorkflowId;
  reason: "unknown_skill" | "unknown_agent" | "unknown_pivot_suite" | "missing_skill_family";
  value?: string;
  missingFamilies?: AgentSkillFamily[];
};

export const NEXUS_WORKFLOW_SKILL_ANALYSIS: NexusWorkflowSkillAnalysis[] = [
  {
    id: "onboarding_evidence_intake",
    name: "Onboarding Evidence Intake",
    status: "live",
    purpose: "Bring initial company files into governed evidence with confidence, provenance, freshness, and sensitivity labels.",
    entrypoints: ["/onboarding", "/api/ingestion/status", "/api/workspace/seed-demo"],
    services: ["lib/services/ingestion.ts", "lib/services/extract.ts", "lib/services/company-detection.ts"],
    dataObjects: ["evidence_records", "workspace_profiles", "audit_events"],
    agentIds: ["data_quality_agent", "ai_governance_agent"],
    pivotSuiteIds: ["nexus", "nucleus"],
    skills: ["ingest sources", "read documents", "read spreadsheets", "browse sources", "extract metadata", "review evidence", "analyze evidence"],
  },
  {
    id: "connector_ingestion",
    name: "Connector Ingestion",
    status: "partial",
    purpose: "Pull source records from Drive, SharePoint, email, Slack, Jira, GitHub, CRM, and finance systems into the same evidence pipeline.",
    entrypoints: ["/api/connectors/*/install", "/api/connectors/*/ingest", "/settings?sources"],
    services: ["lib/connectors/*", "lib/services/ingestion.ts", "lib/data/repository.ts"],
    dataObjects: ["connector_instances", "evidence_records", "audit_events"],
    agentIds: ["data_quality_agent", "customer_success_agent", "technology_health_agent"],
    pivotSuiteIds: ["nexus", "vantage", "meridian"],
    skills: ["ingest sources", "browse sources", "read documents", "read spreadsheets", "extract metadata", "review evidence"],
  },
  {
    id: "evidence_review",
    name: "Evidence Review And Quarantine",
    status: "live",
    purpose: "Route low-confidence, missing-provenance, or policy-sensitive evidence through human review before agents can use it.",
    entrypoints: ["/approvals", "/api/evidence/[id]/review", "/api/evidence"],
    services: ["lib/services/ingestion.ts", "lib/agents/passport-policy.ts", "lib/security/ai-policy.ts"],
    dataObjects: ["evidence_records", "audit_events", "agent_control_profiles"],
    agentIds: ["data_quality_agent", "risk_agent", "ai_governance_agent"],
    pivotSuiteIds: ["nexus", "quorum", "meridian", "vantage", "nucleus"],
    skills: ["review evidence", "review approvals", "review compliance", "search audit", "analyze evidence", "prepare approval packet"],
  },
  {
    id: "agent_room_briefs",
    name: "Agent Room Briefs",
    status: "live",
    purpose: "Generate named specialist agent briefs from approved evidence under each agent passport.",
    entrypoints: ["/dashboard/[role]", "/api/dashboard/[role]", "/api/dispatch"],
    services: ["lib/services/dashboard.ts", "lib/agents/agent-library.ts", "lib/agents/passport-policy.ts", "lib/agents/output-gate.ts"],
    dataObjects: ["agent_outputs", "evidence_records", "agent_control_profiles", "audit_events"],
    agentIds: ["strategy_agent", "risk_agent", "decision_agent", "execution_agent", "growth_agent", "finance_signal_agent"],
    pivotSuiteIds: ["nexus"],
    skills: ["browse sources", "search evidence", "review evidence", "analyze evidence", "summarize", "draft memo"],
  },
  {
    id: "executive_synthesis",
    name: "Executive Synthesis",
    status: "live",
    purpose: "Synthesize specialist agent cards into one role-aware leadership brief and scheduled operating cadence.",
    entrypoints: ["/dashboard/[role]", "/api/synthesis/[role]", "/api/cron/synthesis", "/api/synthesis-schedule"],
    services: ["lib/services/synthesis.ts", "lib/services/synthesis-schedule.ts", "scripts/run-scheduled-synthesis.mjs"],
    dataObjects: ["agent_outputs", "synthesis_schedules", "evidence_records", "audit_events"],
    agentIds: ["strategy_agent", "decision_agent", "risk_agent"],
    pivotSuiteIds: ["nexus"],
    skills: ["browse sources", "search evidence", "compare decisions", "summarize", "review evidence"],
  },
  {
    id: "ask_retrieval",
    name: "Ask And Evidence Retrieval",
    status: "live",
    purpose: "Answer ad hoc questions from governed evidence while applying optional agent-passport filters before retrieval.",
    entrypoints: ["/ask", "/dashboard/[role]", "/api/ask"],
    services: ["lib/services/retrieval.ts", "lib/agents/passport-policy.ts", "lib/services/llm.ts"],
    dataObjects: ["evidence_records", "ask_conversation_messages", "audit_events"],
    agentIds: ["strategy_agent", "data_quality_agent", "risk_agent"],
    pivotSuiteIds: ["nexus"],
    skills: ["browse sources", "search evidence", "search memory", "review evidence", "analyze evidence", "summarize"],
  },
  {
    id: "knowledge_workspace",
    name: "Knowledge Workspace",
    status: "live",
    purpose: "Organize notes, imports, graph refs, backlinks, and workspace memory around Nexus objects.",
    entrypoints: ["/knowledge", "/api/knowledge/*"],
    services: ["lib/services/knowledge.ts", "lib/services/vault-sync.ts", "lib/knowledge/markdown.ts"],
    dataObjects: ["knowledge_notes", "knowledge_links", "knowledge_sync_events", "evidence_records"],
    agentIds: ["strategy_agent", "decision_agent", "data_quality_agent"],
    pivotSuiteIds: ["nexus", "nucleus"],
    skills: ["search memory", "browse sources", "review evidence", "compare documents", "extract themes", "summarize"],
  },
  {
    id: "decision_action_capture",
    name: "Decision And Action Capture",
    status: "live",
    purpose: "Turn agent output and human review into decision records, action owners, priorities, blockers, and rationale.",
    entrypoints: ["/decisions", "/api/decisions", "/api/decisions/extract", "/api/actions"],
    services: ["lib/services/decision-extraction.ts", "lib/data/repository.ts"],
    dataObjects: ["decisions", "actions", "agent_outputs", "audit_events"],
    agentIds: ["decision_agent", "blocker_agent", "execution_agent"],
    pivotSuiteIds: ["nexus", "quorum"],
    skills: ["search memory", "compare decisions", "extract action items", "review approvals", "draft memo"],
  },
  {
    id: "recommendation_approval",
    name: "Recommendation And Approval",
    status: "live",
    purpose: "Create source-backed recommendations and hold high-impact actions at approval boundaries.",
    entrypoints: ["/recommendations", "/approvals", "/api/recommendations", "/api/approvals/[recommendationId]"],
    services: ["lib/services/recommendations.ts", "lib/security/ai-policy.ts", "lib/agents/tool-guard.ts"],
    dataObjects: ["recommendations", "evidence_records", "audit_events", "learning_signals"],
    agentIds: ["risk_agent", "growth_agent", "process_agent", "ai_governance_agent"],
    pivotSuiteIds: ["nexus", "nucleus"],
    skills: ["browse sources", "review approvals", "review evidence", "extract risks", "draft recommendation", "prepare approval packet"],
  },
  {
    id: "workflow_twin_shadow",
    name: "Workflow Twin And Shadow ROI",
    status: "live",
    purpose: "Score candidate pilots, run workflow twins, and compare manual-vs-Nexus operating loops before automation expands.",
    entrypoints: ["/workflows", "/api/workflow-twins", "/api/workflow-twins/[id]/backcast", "/api/dispatch"],
    services: ["lib/services/workflow-twins.ts", "lib/services/dispatcher.ts"],
    dataObjects: ["workflow_twins", "workflow_twin_runs", "decisions", "actions", "recommendations"],
    agentIds: ["process_agent", "execution_agent", "decision_agent", "risk_agent"],
    pivotSuiteIds: ["nexus", "nucleus"],
    skills: ["browse sources", "review evidence", "compare plans", "extract blockers", "draft recommendation"],
  },
  {
    id: "agent_governance",
    name: "Agent Governance And Learning",
    status: "live",
    purpose: "Manage passports, tool rights, output logs, rollback, learning signals, and auditability for each agent.",
    entrypoints: ["/settings?tab=agent-governance", "/api/agent-control-profiles", "/api/agent-outputs", "/api/learning-signals"],
    services: ["lib/agents/default-passports.ts", "lib/agents/passport-policy.ts", "lib/agents/tool-guard.ts"],
    dataObjects: ["agent_control_profiles", "agent_outputs", "learning_signals", "audit_events"],
    agentIds: ["ai_governance_agent", "audit_findings_agent", "risk_agent"],
    pivotSuiteIds: ["nexus", "quorum", "meridian", "vantage", "nucleus"],
    skills: ["search audit", "review approvals", "review compliance", "prepare approval packet", "summarize"],
  },
  {
    id: "pivot_delivery",
    name: "Pivot Delivery Workflows",
    status: "partial",
    purpose: "Apply the shared Nexus engine to Quorum board governance, Meridian regulatory packs, Vantage diligence, and Nucleus readiness.",
    entrypoints: ["/board", "/vantage/*", "/meridian/*", "docs/*_WORKFLOW.md"],
    services: [
      "lib/board-governance-workflow.ts",
      "lib/meridian-regulatory-workflow.ts",
      "lib/vantage-dd-workflow.ts",
      "lib/agents/pivot-agent-catalog.ts"
    ],
    dataObjects: ["evidence_records", "agent_outputs", "decisions", "workflow_twins", "audit_events"],
    agentIds: ["regulatory_obligation_agent", "legal_exposure_agent", "finance_signal_agent", "data_quality_agent", "process_agent"],
    pivotSuiteIds: ["quorum", "meridian", "vantage", "nucleus"],
    skills: ["ingest sources", "browse sources", "review compliance", "extract obligations", "extract risks", "draft memo"],
  },
];

export function skillFamiliesForWorkflow(workflow: NexusWorkflowSkillAnalysis): AgentSkillFamily[] {
  return Array.from(new Set(workflow.skills.map((skill) => AGENT_SKILL_FAMILY[skill])));
}

export function agentsForWorkflow(workflow: NexusWorkflowSkillAnalysis): NexusAgent[] {
  return workflow.agentIds.flatMap((agentId) => {
    const agent = AGENT_LIBRARY[agentId];
    return agent ? [agent] : [];
  });
}

export function validateWorkflowSkillAnalysis(): WorkflowSkillAnalysisIssue[] {
  return NEXUS_WORKFLOW_SKILL_ANALYSIS.flatMap((workflow) => {
    const issues: WorkflowSkillAnalysisIssue[] = [];
    for (const skill of workflow.skills) {
      if (!normalizeAgentSkill(skill)) issues.push({ workflowId: workflow.id, reason: "unknown_skill", value: skill });
    }
    for (const agentId of workflow.agentIds) {
      if (!AGENT_LIBRARY[agentId]) issues.push({ workflowId: workflow.id, reason: "unknown_agent", value: agentId });
    }
    for (const suiteId of workflow.pivotSuiteIds) {
      if (!PIVOT_AGENT_SUITES.some((suite) => suite.id === suiteId)) {
        issues.push({ workflowId: workflow.id, reason: "unknown_pivot_suite", value: suiteId });
      }
    }
    const families = new Set(skillFamiliesForWorkflow(workflow));
    const missingFamilies = (["browse", "review", "analyze"] as AgentSkillFamily[]).filter(
      (family) => !families.has(family)
    );
    if (missingFamilies.length > 0) {
      issues.push({ workflowId: workflow.id, reason: "missing_skill_family", missingFamilies });
    }
    return issues;
  });
}

export function buildWorkflowSkillAnalysis() {
  return {
    workflows: NEXUS_WORKFLOW_SKILL_ANALYSIS.map((workflow) => ({
      ...workflow,
      skillFamilies: skillFamiliesForWorkflow(workflow),
      agents: agentsForWorkflow(workflow).map((agent) => ({
        id: agent.id,
        name: agent.name,
        room: agent.room,
        approvalPolicy: agent.approvalPolicy,
        skillHints: agent.skillHints,
      })),
      pivotSuites: workflow.pivotSuiteIds.flatMap((suiteId) => {
        const suite = PIVOT_AGENT_SUITES.find((item) => item.id === suiteId);
        return suite ? [{ id: suite.id, name: suite.name, productLine: suite.productLine }] : [];
      }),
    })),
    integrity: {
      issues: validateWorkflowSkillAnalysis(),
    },
  };
}
