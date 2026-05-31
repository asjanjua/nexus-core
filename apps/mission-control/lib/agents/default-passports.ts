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
  return Object.keys(AGENT_LIBRARY)
    .map((agentKey) => buildDefaultAgentControlProfile(workspaceId, agentKey, actor))
    .filter((profile): profile is AgentControlProfile => Boolean(profile));
}

