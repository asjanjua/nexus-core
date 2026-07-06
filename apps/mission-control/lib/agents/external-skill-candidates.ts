import type { AgentSkill } from "@/lib/agents/agent-skills";
import {
  NEXUS_WORKFLOW_SKILL_ANALYSIS,
  type NexusWorkflowId,
} from "@/lib/agents/workflow-skill-analysis";
import { normalizeAgentSkill } from "@/lib/agents/agent-skills";

export type ExternalCandidateType = "reference_only" | "operator_skill" | "tool_candidate" | "runtime_candidate";
export type ExternalCandidateRisk = "low" | "medium" | "high";
export type ExternalCandidateReviewStatus = "shortlisted" | "fine_tooth_reviewed" | "blocked";
export type ExternalCandidateLicense =
  | "mit"
  | "apache-2.0"
  | "source_available_proprietary"
  | "mixed"
  | "unknown";

export type ExternalSkillCandidate = {
  id: string;
  rank: number;
  sourceRepo: string;
  sourceUrl: string;
  sourceSkills: string[];
  candidateType: ExternalCandidateType;
  mappedNexusSkills: AgentSkill[];
  mappedWorkflows: NexusWorkflowId[];
  riskLevel: ExternalCandidateRisk;
  license: ExternalCandidateLicense;
  reviewStatus: ExternalCandidateReviewStatus;
  bestNexusUse: string;
  verdict: string;
  runtimeBlockers: string[];
};

export type ExternalSkillCandidateIssue = {
  candidateId: string;
  reason:
    | "duplicate_id"
    | "duplicate_rank"
    | "unknown_skill"
    | "unknown_workflow"
    | "runtime_candidate_without_blockers"
    | "installable_proprietary_candidate"
    | "tool_candidate_without_sandbox_blocker";
  value?: string;
};

export const EXTERNAL_SKILL_CANDIDATES: ExternalSkillCandidate[] = [
  {
    id: "claude-for-legal-tabular-review",
    rank: 1,
    sourceRepo: "anthropics/claude-for-legal",
    sourceUrl: "https://github.com/anthropics/claude-for-legal/blob/main/corporate-legal/skills/tabular-review/SKILL.md",
    sourceSkills: ["corporate-legal/skills/tabular-review"],
    candidateType: "reference_only",
    mappedNexusSkills: [
      "read documents",
      "read contracts",
      "review evidence",
      "extract metadata",
      "extract obligations",
      "extract risks",
      "compare documents",
      "prepare approval packet",
    ],
    mappedWorkflows: ["evidence_review", "ask_retrieval", "knowledge_workspace", "recommendation_approval", "pivot_delivery"],
    riskLevel: "high",
    license: "apache-2.0",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Evidence grids for Vantage data rooms, Quorum evidence matrices, and Meridian compliance review.",
    verdict: "Rebuild the review-grid pattern inside Nexus; do not install the broad legal repo.",
    runtimeBlockers: [
      "reviewGridSchema",
      "reviewGridCell",
      "sampleRunStage",
      "normalizationStage",
      "quoteVerification",
      "reviewerVerification",
    ],
  },
  {
    id: "awesome-copilot-agent-governance",
    rank: 2,
    sourceRepo: "github/awesome-copilot",
    sourceUrl: "https://github.com/github/awesome-copilot/blob/main/skills/agent-governance/SKILL.md",
    sourceSkills: ["skills/agent-governance"],
    candidateType: "reference_only",
    mappedNexusSkills: [
      "search audit",
      "review approvals",
      "review evidence",
      "review compliance",
      "prepare approval packet",
      "analyze evidence",
    ],
    mappedWorkflows: ["agent_governance", "recommendation_approval", "evidence_review", "workflow_twin_shadow", "agent_room_briefs"],
    riskLevel: "medium",
    license: "mit",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Policy composition, pre-flight intent checks, tool gates, and audit events.",
    verdict: "Adapt governance patterns into Nexus passports and dispatcher; do not vendor Python examples.",
    runtimeBlockers: [
      "preflightIntentClassification",
      "policyComposition",
      "persistedToolRateLimits",
      "toolGovernanceAuditEvents",
      "installReviewChecklist",
    ],
  },
  {
    id: "financial-services-private-equity",
    rank: 3,
    sourceRepo: "anthropics/financial-services",
    sourceUrl: "https://github.com/anthropics/financial-services/tree/main/plugins/vertical-plugins/private-equity",
    sourceSkills: ["dd-checklist", "ic-memo", "returns-analysis", "unit-economics"],
    candidateType: "reference_only",
    mappedNexusSkills: [
      "read documents",
      "read spreadsheets",
      "review evidence",
      "summarize variance",
      "extract risks",
      "compare spreadsheets",
      "compare documents",
      "draft memo",
      "draft recommendation",
      "prepare approval packet",
    ],
    mappedWorkflows: [
      "onboarding_evidence_intake",
      "evidence_review",
      "executive_synthesis",
      "recommendation_approval",
      "workflow_twin_shadow",
      "pivot_delivery",
    ],
    riskLevel: "high",
    license: "apache-2.0",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Vantage diligence coverage, red flags, sector overlays, and IC memo scaffolding.",
    verdict: "Adopt Vantage workflow skeletons, not the broad connector-heavy repo.",
    runtimeBlockers: [
      "vantageDealPack",
      "modelTieOutChecks",
      "sourceCitationRequirements",
      "financialAdviceBoundary",
      "premiumConnectorPermissionManifest",
    ],
  },
  {
    id: "knowledge-work-plugins-legal",
    rank: 4,
    sourceRepo: "anthropics/knowledge-work-plugins",
    sourceUrl: "https://github.com/anthropics/knowledge-work-plugins/tree/main/legal",
    sourceSkills: ["review-contract", "compliance-check"],
    candidateType: "reference_only",
    mappedNexusSkills: [
      "read contracts",
      "review compliance",
      "extract obligations",
      "extract risks",
      "compare documents",
      "draft recommendation",
      "prepare approval packet",
      "draft memo",
    ],
    mappedWorkflows: ["evidence_review", "recommendation_approval", "pivot_delivery", "executive_synthesis", "agent_room_briefs"],
    riskLevel: "high",
    license: "apache-2.0",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Quorum and Meridian playbooks, contract review, compliance packets, and escalation language.",
    verdict: "Adapt workflow structure only; runtime use requires jurisdiction packs and reviewer gates.",
    runtimeBlockers: [
      "jurisdictionPacks",
      "qualifiedReviewerGate",
      "legalAdviceBoundary",
      "connectorPermissionManifest",
      "authoritativeSourceVerification",
    ],
  },
  {
    id: "anthropic-document-skills",
    rank: 5,
    sourceRepo: "anthropics/skills",
    sourceUrl: "https://github.com/anthropics/skills/tree/main/skills",
    sourceSkills: ["pdf", "docx", "xlsx"],
    candidateType: "reference_only",
    mappedNexusSkills: [
      "read documents",
      "read spreadsheets",
      "extract metadata",
      "compare documents",
      "compare spreadsheets",
      "summarize exports",
      "draft memo",
    ],
    mappedWorkflows: ["onboarding_evidence_intake", "connector_ingestion", "evidence_review", "executive_synthesis", "pivot_delivery"],
    riskLevel: "high",
    license: "source_available_proprietary",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "PDF, DOCX, and XLSX quality bars for extraction, exports, and spreadsheet integrity.",
    verdict: "Use only as no-copy implementation reference; document skills are not installable or vendorable.",
    runtimeBlockers: [
      "licenseClearance",
      "nativeDocumentParsers",
      "sourceSpanMetadata",
      "xlsxIntegrityChecks",
      "exportValidation",
    ],
  },
  {
    id: "kepano-obsidian-skills",
    rank: 6,
    sourceRepo: "kepano/obsidian-skills",
    sourceUrl: "https://github.com/kepano/obsidian-skills",
    sourceSkills: ["obsidian-markdown", "obsidian-bases", "json-canvas", "obsidian-cli", "defuddle"],
    candidateType: "operator_skill",
    mappedNexusSkills: ["search memory", "search evidence", "extract metadata", "extract themes", "summarize"],
    mappedWorkflows: ["knowledge_workspace", "ask_retrieval", "executive_synthesis", "agent_room_briefs"],
    riskLevel: "medium",
    license: "mit",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Knowledge Workspace and local vault/operator workflows.",
    verdict: "Plausible local operator aid; keep separate from Nexus runtime and tenant data.",
    runtimeBlockers: ["vaultPathBoundary", "tenantDataSeparation", "localOperatorOnlyMode"],
  },
  {
    id: "mcp-git-ingest",
    rank: 7,
    sourceRepo: "adhikasp/mcp-git-ingest",
    sourceUrl: "https://github.com/adhikasp/mcp-git-ingest",
    sourceSkills: ["github_directory_structure", "github_read_important_files"],
    candidateType: "tool_candidate",
    mappedNexusSkills: ["browse sources", "ingest sources", "search evidence", "search audit"],
    mappedWorkflows: ["connector_ingestion", "onboarding_evidence_intake", "evidence_review", "agent_governance"],
    riskLevel: "high",
    license: "mit",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Read-only GitHub repository ingestion.",
    verdict: "Narrow future tool experiment; not a skill and not runtime-ready.",
    runtimeBlockers: ["sandbox", "repoAllowlist", "fileAllowlist", "maxBytes", "secretScan", "evidenceAttribution"],
  },
  {
    id: "browser-use",
    rank: 8,
    sourceRepo: "browser-use/browser-use",
    sourceUrl: "https://github.com/browser-use/browser-use",
    sourceSkills: ["browser automation framework"],
    candidateType: "tool_candidate",
    mappedNexusSkills: ["browse sources", "ingest sources", "search evidence", "search audit"],
    mappedWorkflows: ["connector_ingestion", "onboarding_evidence_intake", "evidence_review", "agent_governance"],
    riskLevel: "high",
    license: "mit",
    reviewStatus: "fine_tooth_reviewed",
    bestNexusUse: "Future governed web research or browser smoke support.",
    verdict: "Experimental tool candidate; requires isolated browser policy before Nexus use.",
    runtimeBlockers: ["browserSandbox", "isolatedProfile", "allowedDomains", "noCredentialReuse", "writeActionApproval", "auditTrail"],
  },
];

export function validateExternalSkillCandidates(): ExternalSkillCandidateIssue[] {
  const workflowIds = new Set(NEXUS_WORKFLOW_SKILL_ANALYSIS.map((workflow) => workflow.id));
  const seenIds = new Set<string>();
  const seenRanks = new Set<number>();

  return EXTERNAL_SKILL_CANDIDATES.flatMap((candidate) => {
    const issues: ExternalSkillCandidateIssue[] = [];

    if (seenIds.has(candidate.id)) issues.push({ candidateId: candidate.id, reason: "duplicate_id" });
    seenIds.add(candidate.id);

    if (seenRanks.has(candidate.rank)) {
      issues.push({ candidateId: candidate.id, reason: "duplicate_rank", value: String(candidate.rank) });
    }
    seenRanks.add(candidate.rank);

    for (const skill of candidate.mappedNexusSkills) {
      if (!normalizeAgentSkill(skill)) {
        issues.push({ candidateId: candidate.id, reason: "unknown_skill", value: skill });
      }
    }

    for (const workflow of candidate.mappedWorkflows) {
      if (!workflowIds.has(workflow)) {
        issues.push({ candidateId: candidate.id, reason: "unknown_workflow", value: workflow });
      }
    }

    if (candidate.candidateType === "runtime_candidate" && candidate.runtimeBlockers.length === 0) {
      issues.push({ candidateId: candidate.id, reason: "runtime_candidate_without_blockers" });
    }

    if (
      candidate.license === "source_available_proprietary" &&
      (candidate.candidateType === "operator_skill" || candidate.candidateType === "runtime_candidate")
    ) {
      issues.push({ candidateId: candidate.id, reason: "installable_proprietary_candidate" });
    }

    if (
      candidate.candidateType === "tool_candidate" &&
      !candidate.runtimeBlockers.some((blocker) => blocker.toLowerCase().includes("sandbox"))
    ) {
      issues.push({ candidateId: candidate.id, reason: "tool_candidate_without_sandbox_blocker" });
    }

    return issues;
  });
}

export function rankedExternalSkillCandidates(): ExternalSkillCandidate[] {
  return [...EXTERNAL_SKILL_CANDIDATES].sort((a, b) => a.rank - b.rank);
}

export function buildExternalSkillCandidateReview() {
  return {
    candidates: rankedExternalSkillCandidates(),
    integrity: {
      issues: validateExternalSkillCandidates(),
    },
  };
}
