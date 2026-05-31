import type { Role } from "@/lib/contracts";

const DEFAULT_AGENT_BRIEFS = ["strategy_agent", "risk_agent", "decision_agent"];

export type AgentRoomId =
  | "executive_command"
  | "operating_room"
  | "growth_room"
  | "technology_data"
  | "finance_room"
  | "people_room"
  | "risk_room";

export type AgentOutputType = "brief" | "risk" | "decision" | "recommendation" | "status";

export type AgentApprovalPolicy = "read_only" | "draft_only" | "approval_required";

export type NexusAgent = {
  id: string;
  name: string;
  room: AgentRoomId;
  mandate: string;
  roleLens: Role[];
  evidenceScope: string[];
  outputType: AgentOutputType;
  approvalPolicy: AgentApprovalPolicy;
  skillHints: string[];
  suggestedNextAction: string;
};

export type AgentRoom = {
  id: AgentRoomId;
  label: string;
  path: string;
  role: Role;
  description: string;
};

export const AGENT_ROOMS: AgentRoom[] = [
  {
    id: "executive_command",
    label: "Executive Command Room",
    path: "/dashboard/ceo",
    role: "ceo",
    description: "Strategy, risk, decisions, capital signals, and cross-functional executive attention.",
  },
  {
    id: "operating_room",
    label: "Operating Room",
    path: "/dashboard/coo",
    role: "coo",
    description: "Execution status, blockers, owners, processes, vendors, and operating cadence.",
  },
  {
    id: "growth_room",
    label: "Growth Room",
    path: "/dashboard/cbo",
    role: "cbo",
    description: "Market signals, partnerships, pipeline, proposals, customers, and competitive movement.",
  },
  {
    id: "technology_data",
    label: "Technology and Data Room",
    path: "/dashboard/cto",
    role: "cto",
    description: "Technology health, data quality, security, architecture, and AI governance posture.",
  },
  {
    id: "finance_room",
    label: "Finance Room",
    path: "/dashboard/cfo",
    role: "cfo",
    description: "Budget, margin, cash, forecasts, and revenue-quality signals.",
  },
  {
    id: "people_room",
    label: "People Room",
    path: "/dashboard/chro",
    role: "chro",
    description: "Capacity, hiring, culture, org design, and people-risk signals.",
  },
  {
    id: "risk_room",
    label: "Risk Room",
    path: "/dashboard/cro",
    role: "cro",
    description: "Compliance, operational risk, vendor risk, regulatory exposure, and incidents.",
  },
];

export const AGENT_LIBRARY: Record<string, NexusAgent> = {
  strategy_agent: {
    id: "strategy_agent",
    name: "Strategy Agent",
    room: "executive_command",
    mandate: "Identify what matters most strategically and where executive attention should go next.",
    roleLens: ["ceo", "cbo"],
    evidenceScope: ["strategy", "board", "planning", "market", "decision"],
    outputType: "brief",
    approvalPolicy: "read_only",
    skillHints: ["search evidence", "summarize", "compare decisions", "draft memo"],
    suggestedNextAction: "Open a decision memo for any unresolved strategic call.",
  },
  risk_agent: {
    id: "risk_agent",
    name: "Risk Agent",
    room: "risk_room",
    mandate: "Surface business, compliance, operating, and execution risks with evidence and urgency.",
    roleLens: ["ceo", "coo", "cto"],
    evidenceScope: ["risk", "compliance", "audit", "incident", "security", "vendor"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["read documents", "extract risks", "prepare approval packet"],
    suggestedNextAction: "Send high-impact risks to the approval queue before external sharing.",
  },
  decision_agent: {
    id: "decision_agent",
    name: "Decision Agent",
    room: "executive_command",
    mandate: "Find open decisions, missing rationale, owners, and evidence needed for a clean executive call.",
    roleLens: ["ceo", "coo", "cbo"],
    evidenceScope: ["decision", "meeting", "board", "status", "owner"],
    outputType: "decision",
    approvalPolicy: "draft_only",
    skillHints: ["search memory", "draft memo", "extract action items"],
    suggestedNextAction: "Create or update the linked decision record with owner and rationale.",
  },
  execution_agent: {
    id: "execution_agent",
    name: "Execution Agent",
    room: "operating_room",
    mandate: "Explain what is on track, delayed, blocked, or failing across execution.",
    roleLens: ["coo"],
    evidenceScope: ["status", "project", "task", "delivery", "operations"],
    outputType: "status",
    approvalPolicy: "read_only",
    skillHints: ["summarize", "extract action items", "create task"],
    suggestedNextAction: "Assign owners to the highest-friction blockers.",
  },
  process_agent: {
    id: "process_agent",
    name: "Process Agent",
    room: "operating_room",
    mandate: "Identify workflow breaks, handoff failures, process gaps, and owner ambiguity.",
    roleLens: ["coo"],
    evidenceScope: ["process", "handoff", "owner", "operations", "incident"],
    outputType: "brief",
    approvalPolicy: "draft_only",
    skillHints: ["compare documents", "extract action items", "draft memo"],
    suggestedNextAction: "Draft a process-fix recommendation for review.",
  },
  blocker_agent: {
    id: "blocker_agent",
    name: "Blocker Agent",
    room: "operating_room",
    mandate: "Track overdue, stalled, or at-risk items and explain what is blocking progress.",
    roleLens: ["coo"],
    evidenceScope: ["blocked", "overdue", "project", "task", "owner"],
    outputType: "status",
    approvalPolicy: "read_only",
    skillHints: ["search evidence", "create task", "send Slack update"],
    suggestedNextAction: "Prepare an owner follow-up packet for human approval.",
  },
  growth_agent: {
    id: "growth_agent",
    name: "Growth Agent",
    room: "growth_room",
    mandate: "Find growth opportunities, market themes, and commercial signals from approved evidence.",
    roleLens: ["cbo", "ceo"],
    evidenceScope: ["growth", "market", "customer", "pipeline", "proposal"],
    outputType: "brief",
    approvalPolicy: "draft_only",
    skillHints: ["summarize", "search evidence", "draft memo"],
    suggestedNextAction: "Turn validated opportunities into recommendation drafts.",
  },
  partnership_agent: {
    id: "partnership_agent",
    name: "Partnership Agent",
    room: "growth_room",
    mandate: "Track partner and business-development movement, stalled items, and relationship signals.",
    roleLens: ["cbo"],
    evidenceScope: ["partner", "bd", "pipeline", "proposal", "meeting"],
    outputType: "status",
    approvalPolicy: "draft_only",
    skillHints: ["extract action items", "prepare approval packet", "send Slack update"],
    suggestedNextAction: "Prepare a partner follow-up brief for review.",
  },
  alignment_agent: {
    id: "alignment_agent",
    name: "Alignment Agent",
    room: "growth_room",
    mandate: "Compare stated strategy with execution evidence and flag drift or misalignment.",
    roleLens: ["cbo", "ceo"],
    evidenceScope: ["strategy", "roadmap", "execution", "decision", "status"],
    outputType: "brief",
    approvalPolicy: "read_only",
    skillHints: ["compare documents", "search memory", "draft memo"],
    suggestedNextAction: "Open an alignment review if strategy and execution diverge.",
  },
  technology_health_agent: {
    id: "technology_health_agent",
    name: "Technology Health Agent",
    room: "technology_data",
    mandate: "Surface reliability, architecture, infrastructure, and technical-debt concerns.",
    roleLens: ["cto"],
    evidenceScope: ["technology", "incident", "roadmap", "architecture", "infrastructure"],
    outputType: "status",
    approvalPolicy: "read_only",
    skillHints: ["read documents", "summarize", "search evidence"],
    suggestedNextAction: "Escalate platform risks that affect customers or executive commitments.",
  },
  data_quality_agent: {
    id: "data_quality_agent",
    name: "Data Quality Agent",
    room: "technology_data",
    mandate: "Assess data completeness, freshness, lineage, confidence, and governance risks.",
    roleLens: ["cto"],
    evidenceScope: ["data", "quality", "governance", "pipeline", "freshness"],
    outputType: "brief",
    approvalPolicy: "read_only",
    skillHints: ["extract metadata", "search evidence", "prepare approval packet"],
    suggestedNextAction: "Route weak or stale evidence back into review before executive synthesis.",
  },
  security_agent: {
    id: "security_agent",
    name: "Security Agent",
    room: "technology_data",
    mandate: "Track security, compliance, access, and data-handling issues from approved evidence.",
    roleLens: ["cto", "ceo"],
    evidenceScope: ["security", "compliance", "audit", "access", "incident"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["read documents", "extract risks", "prepare approval packet"],
    suggestedNextAction: "Send any restricted-data or security exposure to human review.",
  },
  ai_governance_agent: {
    id: "ai_governance_agent",
    name: "AI Governance Agent",
    room: "technology_data",
    mandate: "Monitor AI usage, evidence quality, restricted-data handling, and policy drift.",
    roleLens: ["cto", "ceo"],
    evidenceScope: ["ai", "model", "policy", "evidence", "restricted", "audit"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["search audit", "summarize", "prepare approval packet"],
    suggestedNextAction: "Review policy exceptions before allowing broader agent action.",
  },
  finance_signal_agent: {
    id: "finance_signal_agent",
    name: "Finance Signal Agent",
    room: "finance_room",
    mandate: "Translate budgets, forecasts, revenue packs, and variance notes into executive finance signals.",
    roleLens: ["cfo", "ceo"],
    evidenceScope: ["budget", "forecast", "revenue", "expense", "variance", "finance"],
    outputType: "brief",
    approvalPolicy: "draft_only",
    skillHints: ["read spreadsheets", "summarize variance", "draft memo"],
    suggestedNextAction: "Draft a finance brief highlighting material variances and owner follow-ups.",
  },
  cash_runway_agent: {
    id: "cash_runway_agent",
    name: "Cash and Runway Agent",
    room: "finance_room",
    mandate: "Track cash, runway, burn, collections, and liquidity risks from approved finance evidence.",
    roleLens: ["cfo", "ceo"],
    evidenceScope: ["cash", "runway", "burn", "collections", "liquidity", "working capital"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["read spreadsheets", "extract risks", "prepare approval packet"],
    suggestedNextAction: "Send liquidity or runway concerns to the approval queue before executive circulation.",
  },
  margin_variance_agent: {
    id: "margin_variance_agent",
    name: "Margin Variance Agent",
    room: "finance_room",
    mandate: "Find gross margin, project margin, utilization, pricing, and cost-to-serve movement.",
    roleLens: ["cfo", "managing_partner", "practice_lead"],
    evidenceScope: ["margin", "utilization", "pricing", "cost", "project", "practice"],
    outputType: "recommendation",
    approvalPolicy: "draft_only",
    skillHints: ["compare spreadsheets", "summarize", "draft recommendation"],
    suggestedNextAction: "Create a margin-improvement recommendation with evidence and owner.",
  },
  regulatory_obligation_agent: {
    id: "regulatory_obligation_agent",
    name: "Regulatory Obligation Agent",
    room: "risk_room",
    mandate: "Track obligations, filing dates, policy gaps, supervisory issues, and compliance commitments.",
    roleLens: ["cro", "cco", "general_counsel"],
    evidenceScope: ["regulatory", "policy", "filing", "obligation", "compliance", "supervisory"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["extract obligations", "search evidence", "prepare approval packet"],
    suggestedNextAction: "Escalate obligations with unclear owner, date, or evidence.",
  },
  audit_findings_agent: {
    id: "audit_findings_agent",
    name: "Audit Findings Agent",
    room: "risk_room",
    mandate: "Summarize audit findings, remediation owners, repeat issues, and overdue closure items.",
    roleLens: ["cro", "cco", "cto"],
    evidenceScope: ["audit", "finding", "remediation", "control", "incident", "owner"],
    outputType: "status",
    approvalPolicy: "approval_required",
    skillHints: ["read documents", "extract action items", "prepare approval packet"],
    suggestedNextAction: "Create a remediation tracker for overdue or repeat audit findings.",
  },
  performance_marketing_agent: {
    id: "performance_marketing_agent",
    name: "Performance Marketing Agent",
    room: "growth_room",
    mandate: "Read ad-platform exports and explain spend efficiency, funnel movement, creative fatigue, and conversion risk.",
    roleLens: ["cmo", "growth_officer", "vp_performance_mktg"],
    evidenceScope: ["ad_performance", "social_export", "ads", "campaign", "roas", "cac", "cpc", "cpm", "ctr", "conversion", "creative"],
    outputType: "recommendation",
    approvalPolicy: "draft_only",
    skillHints: ["read spreadsheets", "compare campaigns", "draft recommendation"],
    suggestedNextAction: "Draft a budget or creative-test recommendation for human review.",
  },
  brand_community_agent: {
    id: "brand_community_agent",
    name: "Brand and Community Agent",
    room: "growth_room",
    mandate: "Track organic reach, sentiment, audience quality, community movement, and brand narrative signals.",
    roleLens: ["cmo", "brand_community"],
    evidenceScope: ["social_export", "creator_performance", "social", "community", "sentiment", "reach", "engagement", "brand"],
    outputType: "brief",
    approvalPolicy: "draft_only",
    skillHints: ["summarize social exports", "extract themes", "draft memo"],
    suggestedNextAction: "Prepare a brand/community brief with top themes and risks.",
  },
  creator_performance_agent: {
    id: "creator_performance_agent",
    name: "Creator Performance Agent",
    room: "growth_room",
    mandate: "Assess creator, influencer, affiliate, promo-code, and partnership performance against commercial outcomes.",
    roleLens: ["brand_community", "vp_performance_mktg", "cmo"],
    evidenceScope: ["creator_performance", "creator", "influencer", "affiliate", "promo code", "utm", "partnership"],
    outputType: "recommendation",
    approvalPolicy: "draft_only",
    skillHints: ["read spreadsheets", "compare campaigns", "draft recommendation"],
    suggestedNextAction: "Recommend which creators or affiliate motions to scale, pause, or renegotiate.",
  },
  product_signal_agent: {
    id: "product_signal_agent",
    name: "Product Signal Agent",
    room: "technology_data",
    mandate: "Connect roadmap, usage, feedback, support, and adoption evidence into product priorities.",
    roleLens: ["cpo", "cto"],
    evidenceScope: ["roadmap", "product", "usage", "feedback", "support", "adoption"],
    outputType: "brief",
    approvalPolicy: "draft_only",
    skillHints: ["summarize feedback", "compare roadmap", "draft memo"],
    suggestedNextAction: "Draft a product-priority brief linking customer pain to roadmap choices.",
  },
  customer_success_agent: {
    id: "customer_success_agent",
    name: "Customer Success Agent",
    room: "growth_room",
    mandate: "Track renewal, churn, implementation, support, expansion, and customer-health signals.",
    roleLens: ["vp_customer_success", "growth_officer", "cpo"],
    evidenceScope: ["customer", "renewal", "churn", "support", "implementation", "expansion"],
    outputType: "status",
    approvalPolicy: "draft_only",
    skillHints: ["search evidence", "extract action items", "send Slack update"],
    suggestedNextAction: "Prepare a customer-health packet for accounts with risk or expansion potential.",
  },
  people_signal_agent: {
    id: "people_signal_agent",
    name: "People Signal Agent",
    room: "people_room",
    mandate: "Surface capacity, hiring, attrition, culture, org design, and capability risks.",
    roleLens: ["chro", "practice_lead", "chief_medical"],
    evidenceScope: ["people", "hiring", "capacity", "attrition", "culture", "org"],
    outputType: "brief",
    approvalPolicy: "approval_required",
    skillHints: ["read documents", "extract risks", "draft memo"],
    suggestedNextAction: "Route sensitive people risks for human approval before sharing.",
  },
  clinical_risk_agent: {
    id: "clinical_risk_agent",
    name: "Clinical Risk Agent",
    room: "risk_room",
    mandate: "Track patient-safety, clinical quality, staffing, regulatory, and care-delivery risks.",
    roleLens: ["chief_medical"],
    evidenceScope: ["clinical", "patient", "quality", "staffing", "incident", "care"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["extract risks", "prepare approval packet", "summarize"],
    suggestedNextAction: "Escalate clinical risks with patient-safety implications for review.",
  },
  supply_chain_agent: {
    id: "supply_chain_agent",
    name: "Supply Chain Agent",
    room: "operating_room",
    mandate: "Monitor supplier risk, inventory, delays, fulfillment, procurement, and logistics bottlenecks.",
    roleLens: ["vp_supply_chain", "coo"],
    evidenceScope: ["supplier", "inventory", "procurement", "logistics", "delay", "fulfillment"],
    outputType: "status",
    approvalPolicy: "draft_only",
    skillHints: ["read spreadsheets", "extract blockers", "draft recommendation"],
    suggestedNextAction: "Draft a supplier or inventory-risk brief for operating review.",
  },
  project_control_agent: {
    id: "project_control_agent",
    name: "Project Control Agent",
    room: "operating_room",
    mandate: "Track schedule, budget, scope, owner, dependency, and change-control movement across projects.",
    roleLens: ["project_director", "coo"],
    evidenceScope: ["project", "schedule", "budget", "scope", "dependency", "change control"],
    outputType: "status",
    approvalPolicy: "draft_only",
    skillHints: ["extract action items", "compare plans", "draft memo"],
    suggestedNextAction: "Create a project-control brief for delayed or scope-risk items.",
  },
  legal_exposure_agent: {
    id: "legal_exposure_agent",
    name: "Legal Exposure Agent",
    room: "risk_room",
    mandate: "Find contractual obligations, disputes, approvals, regulatory exposure, and legal-decision gaps.",
    roleLens: ["general_counsel"],
    evidenceScope: ["legal", "contract", "dispute", "obligation", "approval", "regulatory"],
    outputType: "risk",
    approvalPolicy: "approval_required",
    skillHints: ["read contracts", "extract obligations", "prepare approval packet"],
    suggestedNextAction: "Prepare a legal-risk packet for counsel review before executive sharing.",
  },
  local_business_agent: {
    id: "local_business_agent",
    name: "Local Business Agent",
    room: "growth_room",
    mandate: "Track location performance, reviews, local search, footfall proxies, staffing, and franchise issues.",
    roleLens: ["franchise_manager", "coo"],
    evidenceScope: ["local_business", "local_ad_performance", "whatsapp_business", "social_export", "location", "reviews", "google business", "calls", "directions", "branch", "franchise"],
    outputType: "status",
    approvalPolicy: "draft_only",
    skillHints: ["summarize exports", "extract risks", "draft recommendation"],
    suggestedNextAction: "Draft a location-performance brief with review, demand, and service signals.",
  },
};

export const ROLE_AGENT_BRIEFS: Partial<Record<string, string[]>> = {
  ceo: ["strategy_agent", "risk_agent", "decision_agent"],
  cfo: ["finance_signal_agent", "cash_runway_agent", "margin_variance_agent"],
  coo: ["execution_agent", "process_agent", "blocker_agent"],
  cro: ["risk_agent", "audit_findings_agent", "regulatory_obligation_agent"],
  cco: ["regulatory_obligation_agent", "audit_findings_agent", "ai_governance_agent"],
  cbo: ["growth_agent", "partnership_agent", "alignment_agent"],
  growth_officer: ["growth_agent", "performance_marketing_agent", "customer_success_agent"],
  vp_performance_mktg: ["performance_marketing_agent", "creator_performance_agent", "alignment_agent"],
  brand_community: ["brand_community_agent", "creator_performance_agent", "partnership_agent"],
  cmo: ["brand_community_agent", "performance_marketing_agent", "growth_agent"],
  cto: ["technology_health_agent", "data_quality_agent", "security_agent", "ai_governance_agent"],
  cpo: ["product_signal_agent", "alignment_agent", "customer_success_agent"],
  chro: ["people_signal_agent", "process_agent", "blocker_agent"],
  managing_partner: ["strategy_agent", "growth_agent", "margin_variance_agent"],
  chief_medical: ["clinical_risk_agent", "regulatory_obligation_agent", "people_signal_agent"],
  vp_supply_chain: ["supply_chain_agent", "execution_agent", "risk_agent"],
  project_director: ["project_control_agent", "blocker_agent", "risk_agent"],
  practice_lead: ["margin_variance_agent", "customer_success_agent", "people_signal_agent"],
  vp_customer_success: ["customer_success_agent", "risk_agent", "growth_agent"],
  chief_of_staff: ["decision_agent", "blocker_agent", "strategy_agent"],
  general_counsel: ["legal_exposure_agent", "regulatory_obligation_agent", "decision_agent"],
  franchise_manager: ["local_business_agent", "execution_agent", "risk_agent"],
};

export function agentBriefIdsForRole(role: string): string[] {
  return ROLE_AGENT_BRIEFS[role] ?? DEFAULT_AGENT_BRIEFS;
}

export function agentBriefIdsForRoleContext(role: string, archetype?: string | null): string[] {
  if (archetype === "sme_physical") {
    if (role === "ceo") return ["local_business_agent", "cash_runway_agent", "execution_agent"];
    if (role === "coo") return ["execution_agent", "supply_chain_agent", "people_signal_agent"];
    if (role === "cfo") return ["cash_runway_agent", "margin_variance_agent", "finance_signal_agent"];
  }
  return agentBriefIdsForRole(role);
}

export function agentForId(id: string): NexusAgent {
  const agent = AGENT_LIBRARY[id];
  if (!agent) throw new Error(`unknown_agent:${id}`);
  return agent;
}

export function roomForRole(role: Role): AgentRoom {
  return AGENT_ROOMS.find((room) => room.role === role && !room.path.includes("?")) ?? AGENT_ROOMS[0];
}
