import {
  type ActionRight,
  type AgentControlProfile,
  type ApprovalLevel,
  type RiskRating,
  type ReviewCadence,
  type Sensitivity
} from "@/lib/contracts";
import { AGENT_LIBRARY, type NexusAgent } from "@/lib/agents/agent-library";

export const DEFAULT_HARD_STOPS = [
  "send_email",
  "submit_filing",
  "make_payment",
  "modify_contract",
  "contact_regulator",
  "external_posting",
  "source_system_writeback",
  "hr_action",
  "legal_commitment",
  "financial_commitment"
];

export const DEFAULT_ESCALATION_TRIGGERS = [
  "legal_interpretation",
  "regulatory_commitment",
  "statement_of_compliance",
  "pricing_or_fee_commitment",
  "data_residency_statement",
  "data_protection_statement",
  "cross_entity_data_access",
  "external_communication",
  "financial_figure_above_threshold"
];

const REGULATED_SCOPE_SIGNALS = [
  "regulatory",
  "compliance",
  "legal",
  "clinical",
  "patient",
  "aml",
  "kyc",
  "filing",
  "supervisory"
];

const HIGH_RISK_SCOPE_SIGNALS = [
  "risk",
  "audit",
  "security",
  "incident",
  "people",
  "payroll",
  "cash",
  "liquidity",
  "contract"
];

function riskRatingForAgent(agent: NexusAgent): RiskRating {
  const scopes = agent.evidenceScope.join(" ").toLowerCase();
  if (REGULATED_SCOPE_SIGNALS.some((signal) => scopes.includes(signal))) return "regulated";
  if (HIGH_RISK_SCOPE_SIGNALS.some((signal) => scopes.includes(signal))) return "high";
  if (agent.approvalPolicy === "approval_required") return "high";
  return agent.outputType === "recommendation" ? "medium" : "low";
}

function actionRightForAgent(agent: NexusAgent): ActionRight {
  if (agent.approvalPolicy === "read_only") return "summarize";
  if (agent.approvalPolicy === "draft_only") return agent.outputType === "recommendation" ? "recommend" : "draft";
  return "prepare_for_approval";
}

function approvalLevelForRisk(risk: RiskRating): ApprovalLevel {
  if (risk === "regulated") return "partner";
  if (risk === "high") return "owner";
  return "owner";
}

function reviewCadenceForRisk(risk: RiskRating): ReviewCadence {
  return risk === "regulated" || risk === "high" ? "per_output" : "weekly";
}

function maxSensitivityForRisk(risk: RiskRating): Sensitivity {
  return risk === "regulated" || risk === "high" ? "confidential" : "internal";
}

export function buildDefaultAgentControlProfile(
  workspaceId: string,
  agentKey: string,
  actor = "system"
): AgentControlProfile | null {
  const agent = AGENT_LIBRARY[agentKey];
  if (!agent) return null;

  const riskRating = riskRatingForAgent(agent);
  const now = new Date().toISOString();

  return {
    id: `acp-${workspaceId}-${agentKey}-v1`,
    workspaceId,
    agentKey,
    name: agent.name,
    purpose: agent.mandate,
    version: 1,
    status: "active",
    allowedScopes: agent.evidenceScope,
    forbiddenScopes: [],
    maxSensitivity: maxSensitivityForRisk(riskRating),
    crossEntityAccess: false,
    allowedTools: agent.skillHints,
    forbiddenTools: DEFAULT_HARD_STOPS,
    policyControlledApis: {},
    actionRight: actionRightForAgent(agent),
    hardStops: DEFAULT_HARD_STOPS,
    escalationTriggers: DEFAULT_ESCALATION_TRIGGERS,
    approvalLevel: approvalLevelForRisk(riskRating),
    riskRating,
    reviewCadence: reviewCadenceForRisk(riskRating),
    watcherAgents: riskRating === "regulated" || riskRating === "high" ? ["ai_governance_agent"] : [],
    logLevel: "full",
    createdBy: actor,
    createdAt: now,
    updatedBy: actor,
    updatedAt: now
  };
}

export function buildDefaultAgentControlProfiles(
  workspaceId: string,
  actor = "system"
): AgentControlProfile[] {
  return [
    ...Object.keys(AGENT_LIBRARY)
    .map((agentKey) => buildDefaultAgentControlProfile(workspaceId, agentKey, actor))
    .filter((profile): profile is AgentControlProfile => Boolean(profile)),
    ...buildDemoAgentControlProfiles(workspaceId, actor)
  ];
}

export function buildDemoAgentControlProfiles(
  workspaceId: string,
  actor = "system"
): AgentControlProfile[] {
  const now = new Date().toISOString();
  const base = {
    workspaceId,
    version: 1,
    status: "active" as const,
    crossEntityAccess: false,
    forbiddenTools: DEFAULT_HARD_STOPS,
    hardStops: DEFAULT_HARD_STOPS,
    escalationTriggers: DEFAULT_ESCALATION_TRIGGERS,
    watcherAgents: ["ai_governance_agent"],
    logLevel: "full" as const,
    createdBy: actor,
    createdAt: now,
    updatedBy: actor,
    updatedAt: now
  };

  return [
    {
      ...base,
      id: `acp-${workspaceId}-regulatory_response_agent-v1`,
      agentKey: "regulatory_response_agent",
      name: "Regulatory Response Agent",
      purpose: "Draft evidence-backed responses to regulator questions while escalating commitments and legal interpretations for human review.",
      allowedScopes: ["regulatory", "compliance", "policy", "risk", "audit", "board", "legal"],
      forbiddenScopes: ["payroll", "personal", "family", "unrelated_client"],
      maxSensitivity: "confidential",
      allowedTools: ["search evidence", "summarize", "draft memo", "prepare approval packet"],
      policyControlledApis: {},
      actionRight: "prepare_for_approval",
      approvalLevel: "partner",
      riskRating: "regulated",
      reviewCadence: "per_output"
    },
    {
      ...base,
      id: `acp-${workspaceId}-legal_redline_agent-v1`,
      agentKey: "legal_redline_agent",
      name: "Legal Redline Agent",
      purpose: "Summarize clauses and draft redline notes without making legal commitments or modifying contracts automatically.",
      allowedScopes: ["legal", "contract", "agreement", "commercial", "risk"],
      forbiddenScopes: ["payroll", "personal", "family", "unrelated_client"],
      maxSensitivity: "confidential",
      allowedTools: ["read documents", "summarize", "draft memo", "compare documents"],
      policyControlledApis: {},
      actionRight: "draft",
      approvalLevel: "partner",
      riskRating: "high",
      reviewCadence: "per_output"
    },
    {
      ...base,
      id: `acp-${workspaceId}-proposal_partner_agent-v1`,
      agentKey: "proposal_partner_agent",
      name: "Proposal Partner Agent",
      purpose: "Draft proposal sections from approved source material and prepare recommendations for human commercial review.",
      allowedScopes: ["proposal", "pipeline", "meeting", "strategy", "commercial", "customer"],
      forbiddenScopes: ["restricted", "payroll", "personal", "unrelated_client"],
      maxSensitivity: "internal",
      allowedTools: ["search evidence", "summarize", "draft memo", "compare documents"],
      policyControlledApis: {},
      actionRight: "recommend",
      approvalLevel: "owner",
      riskRating: "medium",
      reviewCadence: "weekly",
      watcherAgents: []
    }
  ];
}
