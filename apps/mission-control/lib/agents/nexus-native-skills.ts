import { AGENT_SKILL_FAMILY, normalizeAgentSkill, type AgentSkill, type AgentSkillFamily } from "@/lib/agents/agent-skills";
import { PIVOT_AGENT_SUITES, type PivotAgentSuiteId } from "@/lib/agents/pivot-agent-catalog";
import {
  NEXUS_WORKFLOW_SKILL_ANALYSIS,
  type NexusWorkflowId,
} from "@/lib/agents/workflow-skill-analysis";

export type NexusNativeSkillId =
  | "evidence_grid_review"
  | "agent_governance_review"
  | "vantage_diligence_analysis"
  | "quorum_governance_review"
  | "meridian_compliance_review"
  | "document_integrity_review"
  | "knowledge_workspace_synthesis";

export type NexusNativeSkillRuntimeStatus = "planned" | "designed" | "runtime_ready";

export type NexusNativeSkill = {
  id: NexusNativeSkillId;
  name: string;
  family: AgentSkillFamily;
  purpose: string;
  mappedAgentSkills: AgentSkill[];
  mappedWorkflows: NexusWorkflowId[];
  pivotSuiteIds: PivotAgentSuiteId[];
  requiredData: string[];
  outputs: string[];
  approvalRequired: boolean;
  auditEvents: string[];
  runtimeStatus: NexusNativeSkillRuntimeStatus;
  externalReferences: string[];
};

export type NexusNativeSkillIssue = {
  skillId: NexusNativeSkillId;
  reason:
    | "duplicate_id"
    | "unknown_agent_skill"
    | "family_mismatch"
    | "unknown_workflow"
    | "unknown_pivot_suite"
    | "missing_approval_gate"
    | "missing_audit_event"
    | "runtime_ready_with_external_dependency";
  value?: string;
};

export type NexusNativeSkillCatalogIssue =
  | NexusNativeSkillIssue
  | {
      suiteId: PivotAgentSuiteId;
      reason: "pivot_without_native_skill";
    }
  | {
      workflowId: NexusWorkflowId;
      reason: "workflow_without_native_skill";
    };

export const NEXUS_NATIVE_SKILLS: NexusNativeSkill[] = [
  {
    id: "evidence_grid_review",
    name: "Evidence Grid Review",
    family: "review",
    purpose:
      "Normalize source-backed evidence into reviewer-friendly grids with issue flags, provenance, confidence, and escalation notes.",
    mappedAgentSkills: [
      "read documents",
      "read spreadsheets",
      "review evidence",
      "review approvals",
      "analyze evidence",
      "extract metadata",
      "extract risks",
      "compare documents",
      "prepare approval packet",
    ],
    mappedWorkflows: ["evidence_review", "ask_retrieval", "recommendation_approval", "pivot_delivery"],
    pivotSuiteIds: ["nexus", "quorum", "meridian", "vantage", "nucleus"],
    requiredData: ["evidence_records", "source_spans", "confidence_scores", "review_status"],
    outputs: ["evidence_grid", "issue_flags", "missing_evidence", "reviewer_escalations"],
    approvalRequired: true,
    auditEvents: ["native_skill.evidence_grid_review.started", "native_skill.evidence_grid_review.completed"],
    runtimeStatus: "runtime_ready",
    externalReferences: [],
  },
  {
    id: "agent_governance_review",
    name: "Agent Governance Review",
    family: "review",
    purpose:
      "Check agent passports, tool rights, output boundaries, learning signals, and audit readiness before agents expand autonomy.",
    mappedAgentSkills: [
      "search audit",
      "review approvals",
      "review compliance",
      "review evidence",
      "analyze evidence",
      "prepare approval packet",
    ],
    mappedWorkflows: ["agent_governance", "recommendation_approval", "workflow_twin_shadow", "agent_room_briefs"],
    pivotSuiteIds: ["nexus", "quorum", "meridian", "vantage", "nucleus"],
    requiredData: ["agent_control_profiles", "agent_outputs", "learning_signals", "audit_events"],
    outputs: ["passport_findings", "tool_gate_findings", "approval_packet", "rollback_recommendations"],
    approvalRequired: true,
    auditEvents: ["native_skill.agent_governance_review.started", "native_skill.agent_governance_review.completed"],
    runtimeStatus: "designed",
    externalReferences: ["github/awesome-copilot:agent-governance"],
  },
  {
    id: "vantage_diligence_analysis",
    name: "Vantage Diligence Analysis",
    family: "analyze",
    purpose:
      "Turn data-room evidence into diligence coverage, red flags, model tie-outs, and investment committee handoff material.",
    mappedAgentSkills: [
      "ingest sources",
      "read documents",
      "read spreadsheets",
      "review evidence",
      "summarize variance",
      "extract risks",
      "compare spreadsheets",
      "compare documents",
      "draft memo",
    ],
    mappedWorkflows: ["onboarding_evidence_intake", "evidence_review", "executive_synthesis", "pivot_delivery"],
    pivotSuiteIds: ["vantage"],
    requiredData: ["evidence_records", "financial_exports", "diligence_questions", "advisor_notes"],
    outputs: ["diligence_coverage", "red_flags", "model_tie_outs", "ic_memo_sections"],
    approvalRequired: true,
    auditEvents: ["native_skill.vantage_diligence_analysis.started", "native_skill.vantage_diligence_analysis.completed"],
    runtimeStatus: "runtime_ready",
    externalReferences: [],
  },
  {
    id: "quorum_governance_review",
    name: "Quorum Governance Review",
    family: "review",
    purpose:
      "Review board-pack evidence, decision records, obligations, and approval boundaries before governance material is finalized.",
    mappedAgentSkills: [
      "browse sources",
      "review approvals",
      "review compliance",
      "extract obligations",
      "compare decisions",
      "draft memo",
      "prepare approval packet",
    ],
    mappedWorkflows: ["decision_action_capture", "recommendation_approval", "pivot_delivery"],
    pivotSuiteIds: ["quorum"],
    requiredData: ["board_packs", "decisions", "actions", "obligations", "audit_events"],
    outputs: ["governance_findings", "decision_gaps", "approval_packet", "board_pack_caveats"],
    approvalRequired: true,
    auditEvents: ["native_skill.quorum_governance_review.started", "native_skill.quorum_governance_review.completed"],
    runtimeStatus: "runtime_ready",
    externalReferences: [],
  },
  {
    id: "meridian_compliance_review",
    name: "Meridian Compliance Review",
    family: "review",
    purpose:
      "Map regulatory requirements to source evidence, compliance caveats, reviewer gates, and filing-pack readiness.",
    mappedAgentSkills: [
      "read contracts",
      "browse sources",
      "review compliance",
      "extract obligations",
      "extract risks",
      "compare documents",
      "prepare approval packet",
    ],
    mappedWorkflows: ["evidence_review", "recommendation_approval", "pivot_delivery"],
    pivotSuiteIds: ["meridian"],
    requiredData: ["regulatory_requirements", "evidence_records", "jurisdiction_notes", "review_status"],
    outputs: ["requirement_coverage", "compliance_gaps", "qualified_reviewer_packet", "filing_caveats"],
    approvalRequired: true,
    auditEvents: ["native_skill.meridian_compliance_review.started", "native_skill.meridian_compliance_review.completed"],
    runtimeStatus: "runtime_ready",
    externalReferences: [],
  },
  {
    id: "document_integrity_review",
    name: "Document Integrity Review",
    family: "review",
    purpose:
      "Check parsed PDF, DOCX, XLSX, and export content for source spans, extraction quality, tabular structure, and comparison readiness.",
    mappedAgentSkills: [
      "read documents",
      "read spreadsheets",
      "extract metadata",
      "review evidence",
      "compare documents",
      "compare spreadsheets",
      "summarize exports",
    ],
    mappedWorkflows: ["onboarding_evidence_intake", "connector_ingestion", "evidence_review", "pivot_delivery"],
    pivotSuiteIds: ["nexus", "vantage", "meridian"],
    requiredData: ["source_files", "parsed_text", "table_extracts", "source_spans", "parse_warnings"],
    outputs: ["integrity_findings", "parse_quality_score", "missing_source_spans", "repair_recommendations"],
    approvalRequired: true,
    auditEvents: ["native_skill.document_integrity_review.started", "native_skill.document_integrity_review.completed"],
    runtimeStatus: "runtime_ready",
    externalReferences: [],
  },
  {
    id: "knowledge_workspace_synthesis",
    name: "Knowledge Workspace Synthesis",
    family: "analyze",
    purpose:
      "Organize Nexus notes, graph references, evidence links, and memory into source-backed workspace synthesis.",
    mappedAgentSkills: [
      "search memory",
      "search evidence",
      "browse sources",
      "review evidence",
      "extract themes",
      "compare documents",
      "summarize",
    ],
    mappedWorkflows: ["knowledge_workspace", "ask_retrieval", "executive_synthesis", "agent_room_briefs"],
    pivotSuiteIds: ["nexus", "nucleus"],
    requiredData: ["knowledge_notes", "knowledge_links", "evidence_records", "workspace_memory"],
    outputs: ["workspace_brief", "linked_evidence_map", "theme_summary", "follow_up_questions"],
    approvalRequired: false,
    auditEvents: ["native_skill.knowledge_workspace_synthesis.started", "native_skill.knowledge_workspace_synthesis.completed"],
    runtimeStatus: "planned",
    externalReferences: ["kepano/obsidian-skills"],
  },
];

export function validateNexusNativeSkills(): NexusNativeSkillCatalogIssue[] {
  const workflowIds = new Set(NEXUS_WORKFLOW_SKILL_ANALYSIS.map((workflow) => workflow.id));
  const suiteIds = new Set(PIVOT_AGENT_SUITES.map((suite) => suite.id));
  const seenSkillIds = new Set<NexusNativeSkillId>();
  const coveredWorkflowIds = new Set<NexusWorkflowId>();
  const coveredSuiteIds = new Set<PivotAgentSuiteId>();

  const issues: NexusNativeSkillCatalogIssue[] = [];

  for (const skill of NEXUS_NATIVE_SKILLS) {
    if (seenSkillIds.has(skill.id)) {
      issues.push({ skillId: skill.id, reason: "duplicate_id" });
    }
    seenSkillIds.add(skill.id);

    for (const mappedSkill of skill.mappedAgentSkills) {
      if (!normalizeAgentSkill(mappedSkill)) {
        issues.push({ skillId: skill.id, reason: "unknown_agent_skill", value: mappedSkill });
        continue;
      }
      if (AGENT_SKILL_FAMILY[mappedSkill] === skill.family) continue;
      if (!skill.mappedAgentSkills.some((candidate) => AGENT_SKILL_FAMILY[candidate] === skill.family)) {
        issues.push({ skillId: skill.id, reason: "family_mismatch", value: skill.family });
      }
    }

    for (const workflowId of skill.mappedWorkflows) {
      if (!workflowIds.has(workflowId)) {
        issues.push({ skillId: skill.id, reason: "unknown_workflow", value: workflowId });
      } else {
        coveredWorkflowIds.add(workflowId);
      }
    }

    for (const suiteId of skill.pivotSuiteIds) {
      if (!suiteIds.has(suiteId)) {
        issues.push({ skillId: skill.id, reason: "unknown_pivot_suite", value: suiteId });
      } else {
        coveredSuiteIds.add(suiteId);
      }
    }

    if ((skill.family === "review" || skill.mappedAgentSkills.some((mappedSkill) => AGENT_SKILL_FAMILY[mappedSkill] === "act")) && !skill.approvalRequired) {
      issues.push({ skillId: skill.id, reason: "missing_approval_gate" });
    }

    if (skill.auditEvents.length === 0) {
      issues.push({ skillId: skill.id, reason: "missing_audit_event" });
    }

    if (skill.runtimeStatus === "runtime_ready" && skill.externalReferences.length > 0) {
      issues.push({ skillId: skill.id, reason: "runtime_ready_with_external_dependency" });
    }
  }

  for (const suite of PIVOT_AGENT_SUITES) {
    if (!coveredSuiteIds.has(suite.id)) {
      issues.push({ suiteId: suite.id, reason: "pivot_without_native_skill" });
    }
  }

  for (const workflow of NEXUS_WORKFLOW_SKILL_ANALYSIS) {
    if (!coveredWorkflowIds.has(workflow.id)) {
      issues.push({ workflowId: workflow.id, reason: "workflow_without_native_skill" });
    }
  }

  return issues;
}

export function skillFamiliesForNativeSkill(skill: NexusNativeSkill): AgentSkillFamily[] {
  return Array.from(new Set(skill.mappedAgentSkills.map((mappedSkill) => AGENT_SKILL_FAMILY[mappedSkill])));
}

export function buildNexusNativeSkillCatalog() {
  return {
    skills: NEXUS_NATIVE_SKILLS.map((skill) => ({
      ...skill,
      skillFamilies: skillFamiliesForNativeSkill(skill),
      workflows: skill.mappedWorkflows.flatMap((workflowId) => {
        const workflow = NEXUS_WORKFLOW_SKILL_ANALYSIS.find((item) => item.id === workflowId);
        return workflow ? [{ id: workflow.id, name: workflow.name, status: workflow.status }] : [];
      }),
      pivotSuites: skill.pivotSuiteIds.flatMap((suiteId) => {
        const suite = PIVOT_AGENT_SUITES.find((item) => item.id === suiteId);
        return suite ? [{ id: suite.id, name: suite.name, productLine: suite.productLine }] : [];
      }),
    })),
    integrity: {
      issues: validateNexusNativeSkills(),
    },
  };
}
