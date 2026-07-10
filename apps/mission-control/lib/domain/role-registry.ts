import type { CompanyArchetype } from "@/lib/contracts";

export type RoleLifecycleState = "active" | "staged" | "available";

export type RoleRegistryEntry = {
  key: string;
  label: string;
  archetypeLabels: Partial<Record<CompanyArchetype, string>>;
  archetypeRelevance: Partial<Record<CompanyArchetype, number>>;
  sectorRelevance: Record<string, number>;
  stageThreshold?: string[];
  sizeThreshold?: string[];
  regulatoryTrigger?: boolean;
  businessModelSignals: string[];
  staged: boolean;
  stagedCondition?: string;
  evidenceScope: string[];
  agentIds: string[];
};

export const ROLE_REGISTRY: Record<string, RoleRegistryEntry> = {
  ceo: {
    key: "ceo",
    label: "CEO / MD",
    archetypeLabels: {
      corporate: "CEO / MD",
      startup_scaleup: "Founder / MD",
      sme_physical: "Owner",
      digital_native: "Founder / CEO",
      professional_practice: "Managing Partner"
    },
    archetypeRelevance: {
      corporate: 1,
      startup_scaleup: 1,
      sme_physical: 1,
      digital_native: 1,
      professional_practice: 1
    },
    sectorRelevance: {},
    businessModelSignals: [],
    staged: false,
    evidenceScope: ["strategy", "risk", "decision", "board", "planning"],
    agentIds: ["strategy_agent", "risk_agent", "decision_agent"]
  },
  cfo: {
    key: "cfo",
    label: "CFO / Head of Finance",
    archetypeLabels: { sme_physical: "Accounts / Cash", startup_scaleup: "Head of Finance" },
    archetypeRelevance: { corporate: 0.85, startup_scaleup: 0.75, sme_physical: 0.72, digital_native: 0.7, professional_practice: 0.78 },
    sectorRelevance: { financial_services: 0.95, real_estate_construction: 0.82, manufacturing: 0.8, retail_commerce: 0.76 },
    stageThreshold: ["growth", "scale_up", "enterprise", "public"],
    sizeThreshold: ["51_200", "201_1000", "1001_5000", "5000_plus"],
    businessModelSignals: ["finance", "cash", "margin", "budget", "p&l", "runway", "payroll", "accounts"],
    staged: false,
    evidenceScope: ["finance", "budget", "cash", "revenue", "margin"],
    agentIds: ["finance_signal_agent", "cash_runway_agent", "margin_variance_agent"]
  },
  coo: {
    key: "coo",
    label: "COO / Head of Operations",
    archetypeLabels: { sme_physical: "Ops Manager", startup_scaleup: "Head of Operations" },
    archetypeRelevance: { corporate: 0.86, startup_scaleup: 0.78, sme_physical: 0.86, digital_native: 0.62, professional_practice: 0.72 },
    sectorRelevance: { manufacturing: 0.95, healthcare: 0.88, retail_commerce: 0.86, real_estate_construction: 0.84 },
    businessModelSignals: ["operations", "delivery", "process", "staff", "supplier", "locations", "logistics"],
    staged: false,
    evidenceScope: ["operations", "status", "process", "delivery", "staff"],
    agentIds: ["execution_agent", "process_agent", "blocker_agent"]
  },
  cro: {
    key: "cro",
    label: "CRO / Head of Risk",
    archetypeLabels: { sme_physical: "Risk Lead" },
    archetypeRelevance: { corporate: 0.82, startup_scaleup: 0.45, sme_physical: 0.3, digital_native: 0.42, professional_practice: 0.55 },
    sectorRelevance: { financial_services: 1, healthcare: 0.86, real_estate_construction: 0.62 },
    regulatoryTrigger: true,
    businessModelSignals: ["risk", "regulator", "regulated", "audit", "aml", "kyc", "fraud", "compliance"],
    staged: false,
    evidenceScope: ["risk", "audit", "incident", "vendor", "regulatory"],
    agentIds: ["risk_agent", "audit_findings_agent", "regulatory_obligation_agent"]
  },
  cco: {
    key: "cco",
    label: "CCO / Compliance Officer",
    archetypeLabels: { sme_physical: "Compliance Officer" },
    archetypeRelevance: { corporate: 0.76, startup_scaleup: 0.4, sme_physical: 0.25, digital_native: 0.35, professional_practice: 0.6 },
    sectorRelevance: { financial_services: 0.96, healthcare: 0.88, education_training: 0.55 },
    regulatoryTrigger: true,
    businessModelSignals: ["compliance", "policy", "regulatory", "submission", "breach", "license"],
    staged: false,
    evidenceScope: ["compliance", "policy", "regulatory", "audit"],
    agentIds: ["regulatory_obligation_agent", "audit_findings_agent", "ai_governance_agent"]
  },
  cbo: {
    key: "cbo",
    label: "CBO / Strategy",
    archetypeLabels: { startup_scaleup: "Business Lead", professional_practice: "Business Development Partner" },
    archetypeRelevance: { corporate: 0.72, startup_scaleup: 0.76, sme_physical: 0.45, digital_native: 0.7, professional_practice: 0.84 },
    sectorRelevance: { professional_services: 0.9, real_estate_construction: 0.72, financial_services: 0.62 },
    businessModelSignals: ["business development", "partnership", "proposal", "pipeline", "sales", "growth"],
    staged: false,
    evidenceScope: ["pipeline", "proposal", "partnership", "market", "growth"],
    agentIds: ["growth_agent", "partnership_agent", "alignment_agent"]
  },
  growth_officer: {
    key: "growth_officer",
    label: "Head of Growth",
    archetypeLabels: { startup_scaleup: "Growth Lead", digital_native: "Growth Lead" },
    archetypeRelevance: { startup_scaleup: 0.86, digital_native: 0.94, corporate: 0.35, sme_physical: 0.25, professional_practice: 0.45 },
    sectorRelevance: { technology_saas: 0.9, retail_commerce: 0.82, education_training: 0.62 },
    businessModelSignals: ["growth", "funnel", "conversion", "retention", "ltv", "cac", "plg", "referral"],
    staged: false,
    evidenceScope: ["funnel", "retention", "acquisition", "conversion"],
    agentIds: ["growth_agent", "performance_marketing_agent", "customer_success_agent"]
  },
  vp_performance_mktg: {
    key: "vp_performance_mktg",
    label: "Head of Performance Marketing",
    archetypeLabels: { digital_native: "Performance Marketing Lead" },
    archetypeRelevance: { digital_native: 0.96, startup_scaleup: 0.72 },
    sectorRelevance: { retail_commerce: 0.92, technology_saas: 0.72, education_training: 0.65 },
    businessModelSignals: ["meta ads", "google ads", "tiktok", "roas", "performance marketing", "paid social", "campaign"],
    staged: false,
    evidenceScope: ["ad_performance", "social_export", "email_crm"],
    agentIds: ["performance_marketing_agent", "creator_performance_agent", "alignment_agent"]
  },
  brand_community: {
    key: "brand_community",
    label: "Brand / Community",
    archetypeLabels: { digital_native: "Brand and Community Lead" },
    archetypeRelevance: { digital_native: 0.84, startup_scaleup: 0.58, sme_physical: 0.42 },
    sectorRelevance: { retail_commerce: 0.85, education_training: 0.56, professional_services: 0.52 },
    businessModelSignals: ["brand", "community", "creator", "influencer", "social", "content", "engagement"],
    staged: false,
    evidenceScope: ["social_export", "creator_performance", "sentiment"],
    agentIds: ["brand_community_agent", "creator_performance_agent", "partnership_agent"]
  },
  cmo: {
    key: "cmo",
    label: "CMO / Head of Marketing",
    archetypeLabels: { sme_physical: "Marketing Lead" },
    archetypeRelevance: { corporate: 0.7, startup_scaleup: 0.6, sme_physical: 0.45, digital_native: 0.72, professional_practice: 0.52 },
    sectorRelevance: { retail_commerce: 0.86, healthcare: 0.58, education_training: 0.7 },
    businessModelSignals: ["marketing", "campaign", "brand", "pr", "customer acquisition"],
    staged: false,
    evidenceScope: ["marketing", "campaign", "brand", "customer"],
    agentIds: ["brand_community_agent", "performance_marketing_agent", "growth_agent"]
  },
  cto: {
    key: "cto",
    label: "CTO / CDO",
    archetypeLabels: { startup_scaleup: "Technology Lead", sme_physical: "Technology Owner" },
    archetypeRelevance: { corporate: 0.68, startup_scaleup: 0.9, sme_physical: 0.36, digital_native: 0.92, professional_practice: 0.5 },
    sectorRelevance: { technology_saas: 1, financial_services: 0.82, healthcare: 0.7 },
    businessModelSignals: ["technology", "platform", "app", "data", "security", "ai", "software"],
    staged: false,
    evidenceScope: ["technology", "data", "security", "roadmap", "incident"],
    agentIds: ["technology_health_agent", "data_quality_agent", "security_agent", "ai_governance_agent"]
  },
  cpo: {
    key: "cpo",
    label: "CPO / Product",
    archetypeLabels: { startup_scaleup: "Product Lead", digital_native: "Product Lead" },
    archetypeRelevance: { startup_scaleup: 0.86, digital_native: 0.82, corporate: 0.48 },
    sectorRelevance: { technology_saas: 0.94, financial_services: 0.62, education_training: 0.58 },
    businessModelSignals: ["product", "roadmap", "feature", "user research", "nps", "activation"],
    staged: false,
    evidenceScope: ["roadmap", "feature", "product", "feedback", "nps"],
    agentIds: ["product_signal_agent", "alignment_agent", "customer_success_agent"]
  },
  chro: {
    key: "chro",
    label: "CHRO / Head of People",
    archetypeLabels: { sme_physical: "People / Staff Lead" },
    archetypeRelevance: { corporate: 0.68, startup_scaleup: 0.56, sme_physical: 0.6, digital_native: 0.52, professional_practice: 0.62 },
    sectorRelevance: { healthcare: 0.78, professional_services: 0.72, retail_commerce: 0.62 },
    stageThreshold: ["scale_up", "enterprise", "public"],
    sizeThreshold: ["201_1000", "1001_5000", "5000_plus"],
    businessModelSignals: ["people", "hr", "staff", "hiring", "attrition", "culture", "payroll"],
    staged: false,
    evidenceScope: ["people", "hiring", "headcount", "attrition", "culture"],
    agentIds: ["people_signal_agent", "process_agent", "blocker_agent"]
  },
  managing_partner: {
    key: "managing_partner",
    label: "Managing Partner",
    archetypeLabels: { professional_practice: "Managing Partner" },
    archetypeRelevance: { professional_practice: 1 },
    sectorRelevance: { professional_services: 0.98 },
    businessModelSignals: ["partner", "practice", "client", "utilisation", "retainer"],
    staged: false,
    evidenceScope: ["client", "practice", "utilisation", "pipeline"],
    agentIds: ["strategy_agent", "growth_agent", "margin_variance_agent"]
  },
  chief_medical: {
    key: "chief_medical",
    label: "Chief Medical Officer",
    archetypeLabels: {},
    archetypeRelevance: { corporate: 0.52, professional_practice: 0.58 },
    sectorRelevance: { healthcare: 1 },
    businessModelSignals: ["clinical", "patient", "medical", "accreditation", "outcomes"],
    staged: false,
    evidenceScope: ["clinical", "patient", "audit", "incident"],
    agentIds: ["clinical_risk_agent", "regulatory_obligation_agent", "people_signal_agent"]
  },
  vp_supply_chain: {
    key: "vp_supply_chain",
    label: "VP Supply Chain",
    archetypeLabels: { sme_physical: "Supplier / Stock Lead" },
    archetypeRelevance: { corporate: 0.62, sme_physical: 0.66 },
    sectorRelevance: { manufacturing: 0.98, retail_commerce: 0.78, healthcare: 0.45 },
    businessModelSignals: ["supplier", "inventory", "stock", "procurement", "lead time", "logistics"],
    staged: false,
    evidenceScope: ["supplier", "inventory", "procurement", "logistics"],
    agentIds: ["supply_chain_agent", "execution_agent", "risk_agent"]
  },
  project_director: {
    key: "project_director",
    label: "Project Director",
    archetypeLabels: {},
    archetypeRelevance: { corporate: 0.55, sme_physical: 0.5 },
    sectorRelevance: { real_estate_construction: 1, manufacturing: 0.42 },
    businessModelSignals: ["project", "construction", "milestone", "contractor", "development"],
    staged: false,
    evidenceScope: ["project", "cost", "milestone", "contractor"],
    agentIds: ["project_control_agent", "blocker_agent", "risk_agent"]
  },
  practice_lead: {
    key: "practice_lead",
    label: "Practice Lead",
    archetypeLabels: { professional_practice: "Practice Lead" },
    archetypeRelevance: { professional_practice: 0.86 },
    sectorRelevance: { professional_services: 0.92 },
    businessModelSignals: ["practice", "utilisation", "engagement", "team lead"],
    staged: false,
    evidenceScope: ["practice", "utilisation", "engagement", "client"],
    agentIds: ["margin_variance_agent", "customer_success_agent", "people_signal_agent"]
  },
  vp_customer_success: {
    key: "vp_customer_success",
    label: "Head of Customer Success",
    archetypeLabels: { startup_scaleup: "Customer Success Lead", digital_native: "Customer Success Lead" },
    archetypeRelevance: { startup_scaleup: 0.74, digital_native: 0.66, corporate: 0.48 },
    sectorRelevance: { technology_saas: 0.9, professional_services: 0.46 },
    businessModelSignals: ["customer success", "churn", "nrr", "qbr", "renewal", "health score"],
    staged: false,
    evidenceScope: ["customer", "renewal", "churn", "health"],
    agentIds: ["customer_success_agent", "risk_agent", "growth_agent"]
  },
  chief_of_staff: {
    key: "chief_of_staff",
    label: "Chief of Staff",
    archetypeLabels: {},
    archetypeRelevance: { startup_scaleup: 0.52, corporate: 0.46, digital_native: 0.42 },
    sectorRelevance: {},
    sizeThreshold: ["201_1000", "1001_5000", "5000_plus"],
    businessModelSignals: ["chief of staff", "follow up", "executive cadence", "priority"],
    staged: true,
    stagedCondition: "Activates when the CEO needs leverage across 100+ people or multiple functions.",
    evidenceScope: ["decision", "follow-up", "priority", "meeting"],
    agentIds: ["decision_agent", "blocker_agent", "strategy_agent"]
  },
  general_counsel: {
    key: "general_counsel",
    label: "General Counsel",
    archetypeLabels: {},
    archetypeRelevance: { corporate: 0.42, startup_scaleup: 0.28 },
    sectorRelevance: { financial_services: 0.58, healthcare: 0.52, real_estate_construction: 0.5 },
    businessModelSignals: ["legal", "contract", "litigation", "ip", "m&a", "counsel"],
    staged: true,
    stagedCondition: "Activates with contract complexity, disputes, M&A, or regulatory filings.",
    evidenceScope: ["legal", "contract", "regulatory", "dispute"],
    agentIds: ["legal_exposure_agent", "regulatory_obligation_agent", "decision_agent"]
  },
  franchise_manager: {
    key: "franchise_manager",
    label: "Franchise Manager",
    archetypeLabels: { sme_physical: "Franchise Manager" },
    archetypeRelevance: { sme_physical: 0.52, corporate: 0.35 },
    sectorRelevance: { retail_commerce: 0.62 },
    businessModelSignals: ["franchise", "franchisee", "location", "branch", "royalty"],
    staged: true,
    stagedCondition: "Activates when the company operates franchised or multi-location units.",
    evidenceScope: ["location", "franchise", "sales", "compliance"],
    agentIds: ["local_business_agent", "execution_agent", "risk_agent"]
  }
};

export function labelForRole(roleKey: string, archetype?: CompanyArchetype | null): string {
  const role = ROLE_REGISTRY[roleKey];
  if (!role) return roleKey.replace(/[_:-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (archetype ? role.archetypeLabels[archetype] : undefined) ?? role.label;
}
