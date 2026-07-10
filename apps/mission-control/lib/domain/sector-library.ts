/**
 * Sector taxonomy library for NexusAI Mission Control.
 *
 * Defines 8 broad company types, each with domain-specific defaults used to:
 *   - Pre-populate onboarding wizard options
 *   - Inject business context into LLM prompts for dashboards, ask, and recommendations
 *   - Set sensitivity defaults for ingested documents
 *   - Suggest relevant C-suite roles and KPIs
 */

import type { BriefLanguageMode, CompanyArchetype } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectorKey =
  | "financial_services"
  | "professional_services"
  | "technology_saas"
  | "manufacturing"
  | "retail_commerce"
  | "healthcare"
  | "real_estate_construction"
  | "education_training";

export type Subsector = { key: string; label: string };

export type SectorDefinition = {
  key: SectorKey;
  label: string;
  description: string;
  subsectors: Subsector[];
  defaultRoles: string[];
  commonKPIs: string[];
  commonRisks: string[];
  documentTypes: string[];
  recommendedDashboards: string[];
  commonRecommendations: string[];
  sensitivityDefault: "internal" | "confidential";
};

export type ArchetypeEvidenceExpectation = {
  archetype: CompanyArchetype;
  label: string;
  evidenceTypes: string[];
  briefLanguageMode: BriefLanguageMode;
};

export const ARCHETYPE_EVIDENCE_EXPECTATIONS: Record<CompanyArchetype, ArchetypeEvidenceExpectation> = {
  corporate: {
    archetype: "corporate",
    label: "Corporate / governed company",
    evidenceTypes: [
      "Board packs",
      "Risk registers",
      "Regulatory filings",
      "Financial statements",
      "Audit findings",
      "Executive committee minutes"
    ],
    briefLanguageMode: "formal"
  },
  startup_scaleup: {
    archetype: "startup_scaleup",
    label: "Startup / scale-up",
    evidenceTypes: [
      "Product roadmap",
      "Investor updates",
      "Burn and runway model",
      "OKR tracking",
      "Hiring plan",
      "Customer feedback"
    ],
    briefLanguageMode: "formal"
  },
  sme_physical: {
    archetype: "sme_physical",
    label: "Owner-operated physical business",
    evidenceTypes: [
      "POS reports",
      "Weekly cash summary",
      "Google Reviews / Business Profile exports",
      "Staff rota",
      "Supplier invoices",
      "WhatsApp Business broadcast analytics"
    ],
    briefLanguageMode: "plain"
  },
  digital_native: {
    archetype: "digital_native",
    label: "Digital-native / internet-first company",
    evidenceTypes: [
      "Meta Ads exports",
      "Google Ads reports",
      "TikTok Business analytics",
      "Social analytics",
      "Email CRM reports",
      "Creator / influencer performance data"
    ],
    briefLanguageMode: "formal"
  },
  professional_practice: {
    archetype: "professional_practice",
    label: "Professional practice",
    evidenceTypes: [
      "Engagement tracker",
      "WIP schedule",
      "Utilisation report",
      "Client pipeline",
      "Retainer report",
      "Client meeting notes"
    ],
    briefLanguageMode: "formal"
  }
};

// ---------------------------------------------------------------------------
// Sector library
// ---------------------------------------------------------------------------

export const SECTOR_LIBRARY: Record<SectorKey, SectorDefinition> = {
  financial_services: {
    key: "financial_services",
    label: "Financial Services",
    description: "Banks, fintechs, payment processors, insurance, asset management, and EMIs",
    subsectors: [
      { key: "digital_banking", label: "Digital Banking / Neobank" },
      { key: "payments", label: "Payments & Wallets" },
      { key: "insurance", label: "Insurance & Insurtech" },
      { key: "asset_management", label: "Asset Management" },
      { key: "lending", label: "Lending & Credit" },
      { key: "capital_markets", label: "Capital Markets" },
    ],
    defaultRoles: ["CEO", "CFO", "CRO", "COO", "CTO", "CCO"],
    commonKPIs: [
      "NIM (Net Interest Margin)",
      "CAC (Customer Acquisition Cost)",
      "AUM / Wallet balances",
      "Transaction volume (TPS)",
      "NPL ratio",
      "Regulatory capital ratio (CAR)",
      "Customer LTV",
      "Churn rate",
    ],
    commonRisks: [
      "Regulatory non-compliance (AML/CTF, KYC)",
      "Credit concentration risk",
      "Operational / system downtime",
      "Cybersecurity and data breach",
      "Liquidity mismatch",
      "Fraud and financial crime",
      "Third-party / vendor dependency",
    ],
    documentTypes: [
      "Board packs",
      "Risk and compliance reports",
      "Regulatory submissions",
      "Audit findings",
      "Financial statements",
      "Product roadmap",
      "Customer segment reports",
    ],
    recommendedDashboards: ["ceo", "coo", "cto", "cbo"],
    commonRecommendations: [
      "Strengthen AML transaction monitoring thresholds",
      "Reduce customer onboarding friction with digital KYC",
      "Diversify revenue streams beyond fee income",
      "Implement real-time fraud detection on high-value transactions",
    ],
    sensitivityDefault: "confidential",
  },

  professional_services: {
    key: "professional_services",
    label: "Professional Services",
    description: "Consulting, legal, accounting, advisory, and management firms",
    subsectors: [
      { key: "management_consulting", label: "Management Consulting" },
      { key: "legal", label: "Legal Services" },
      { key: "accounting_audit", label: "Accounting & Audit" },
      { key: "it_consulting", label: "IT Consulting" },
      { key: "executive_search", label: "Executive Search / HR" },
    ],
    defaultRoles: ["Managing Partner", "CEO", "CFO", "COO", "CBO", "Practice Lead"],
    commonKPIs: [
      "Billable utilisation rate",
      "Revenue per head",
      "Pipeline value (weighted)",
      "Proposal win rate",
      "Client NPS",
      "Project margin",
      "Partner chargeable hours",
    ],
    commonRisks: [
      "Key-person dependency",
      "Pipeline concentration in one sector",
      "Scope creep on fixed-fee engagements",
      "Conflict of interest",
      "IP and confidentiality breach",
      "Talent attrition",
    ],
    documentTypes: [
      "Engagement proposals",
      "Statements of work",
      "Project status reports",
      "Client meeting notes",
      "Invoices and WIP schedules",
      "Knowledge base articles",
    ],
    recommendedDashboards: ["ceo", "coo", "cbo"],
    commonRecommendations: [
      "Improve proposal pipeline visibility with a structured CRM",
      "Reduce key-person risk by cross-training on top accounts",
      "Create retainer structures for recurring advisory clients",
      "Formalise client satisfaction reviews at each milestone",
    ],
    sensitivityDefault: "confidential",
  },

  technology_saas: {
    key: "technology_saas",
    label: "Technology / SaaS",
    description: "Software companies, platforms, AI products, and developer tools",
    subsectors: [
      { key: "b2b_saas", label: "B2B SaaS" },
      { key: "b2c_platform", label: "B2C Platform" },
      { key: "ai_ml", label: "AI / ML Products" },
      { key: "developer_tools", label: "Developer Tools" },
      { key: "marketplace", label: "Marketplace" },
      { key: "infrastructure", label: "Infrastructure / DevOps" },
    ],
    defaultRoles: ["CEO", "CTO", "CPO", "CFO", "CMO", "VP Engineering"],
    commonKPIs: [
      "MRR / ARR",
      "Net Revenue Retention (NRR)",
      "Gross margin",
      "CAC and CAC payback period",
      "Monthly Active Users (MAU)",
      "Churn rate",
      "Feature adoption rate",
      "Infrastructure cost per customer",
    ],
    commonRisks: [
      "Product-market fit uncertainty",
      "Technical debt accumulation",
      "Security vulnerabilities and data breaches",
      "Cloud cost overruns",
      "Talent competition",
      "Regulatory compliance (GDPR, AI Act)",
      "Dependency on third-party APIs",
    ],
    documentTypes: [
      "Product roadmap",
      "Engineering sprint reports",
      "Customer feedback and NPS",
      "Security audits",
      "Financial model / investor deck",
      "SLA and uptime reports",
    ],
    recommendedDashboards: ["ceo", "cto", "coo"],
    commonRecommendations: [
      "Prioritise NRR improvement over new logo acquisition",
      "Implement automated security scanning in CI/CD pipeline",
      "Define a feature sunset process to reduce product complexity",
      "Build customer success playbooks to reduce churn",
    ],
    sensitivityDefault: "internal",
  },

  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing",
    description: "Industrial manufacturers, FMCG producers, and supply chain operators",
    subsectors: [
      { key: "fmcg", label: "FMCG / Consumer Goods" },
      { key: "industrial", label: "Industrial Equipment" },
      { key: "automotive", label: "Automotive" },
      { key: "food_beverage", label: "Food & Beverage" },
      { key: "pharmaceuticals", label: "Pharmaceuticals" },
      { key: "electronics", label: "Electronics / Hardware" },
    ],
    defaultRoles: ["CEO", "COO", "CFO", "VP Supply Chain", "VP Quality", "CTO"],
    commonKPIs: [
      "Overall Equipment Effectiveness (OEE)",
      "COGS and gross margin",
      "Inventory turnover",
      "On-time-in-full (OTIF) delivery",
      "Defect / rework rate",
      "Capacity utilisation",
      "Energy cost per unit",
    ],
    commonRisks: [
      "Supply chain disruption",
      "Raw material price volatility",
      "Equipment failure / downtime",
      "Quality and regulatory compliance",
      "Environmental / ESG obligations",
      "Labour shortages",
      "Geopolitical risk in sourcing",
    ],
    documentTypes: [
      "Production reports",
      "Quality audit findings",
      "Supplier contracts and scorecards",
      "Inventory and demand forecasts",
      "Safety incident reports",
      "Maintenance logs",
    ],
    recommendedDashboards: ["ceo", "coo", "cto"],
    commonRecommendations: [
      "Implement predictive maintenance to reduce unplanned downtime",
      "Diversify supplier base to reduce single-source risk",
      "Automate quality inspection at key production checkpoints",
      "Build a 90-day critical materials buffer stock",
    ],
    sensitivityDefault: "internal",
  },

  retail_commerce: {
    key: "retail_commerce",
    label: "Retail / Commerce",
    description: "Retailers, e-commerce brands, omnichannel operators, and marketplaces",
    subsectors: [
      { key: "ecommerce", label: "E-commerce / DTC" },
      { key: "omnichannel", label: "Omnichannel Retail" },
      { key: "grocery", label: "Grocery / Convenience" },
      { key: "fashion_apparel", label: "Fashion & Apparel" },
      { key: "marketplace_platform", label: "Marketplace Platform" },
    ],
    defaultRoles: ["CEO", "CFO", "CMO", "COO", "CTO", "VP Merchandising"],
    commonKPIs: [
      "Revenue and same-store sales growth",
      "Gross margin per category",
      "Inventory shrinkage",
      "Customer acquisition cost",
      "Average order value (AOV)",
      "Return rate",
      "Net Promoter Score (NPS)",
    ],
    commonRisks: [
      "Inventory mismanagement and excess stock",
      "Supply chain lead time volatility",
      "Customer experience decline",
      "Competitive margin pressure",
      "Fraud and payment security",
      "Demand forecast accuracy",
    ],
    documentTypes: [
      "Weekly trading reports",
      "Category performance reviews",
      "Supplier performance scorecards",
      "Customer research and NPS surveys",
      "Promotional campaign briefs",
      "Inventory aging reports",
    ],
    recommendedDashboards: ["ceo", "coo", "cbo"],
    commonRecommendations: [
      "Improve demand forecasting with historical sell-through data",
      "Reduce return rates by improving product descriptions",
      "Launch loyalty programme to improve repeat purchase rate",
      "Renegotiate supplier payment terms to improve working capital",
    ],
    sensitivityDefault: "internal",
  },

  healthcare: {
    key: "healthcare",
    label: "Healthcare",
    description: "Hospitals, clinics, healthtech companies, and medical device firms",
    subsectors: [
      { key: "hospital_clinic", label: "Hospital / Clinic" },
      { key: "healthtech", label: "Healthtech / Digital Health" },
      { key: "pharma", label: "Pharmaceuticals" },
      { key: "medical_devices", label: "Medical Devices" },
      { key: "insurance_tpa", label: "Health Insurance / TPA" },
    ],
    defaultRoles: ["CEO", "CFO", "CMO", "COO", "CTO", "Chief Medical Officer"],
    commonKPIs: [
      "Patient satisfaction (CSAT / NPS)",
      "Readmission rate",
      "Average revenue per patient",
      "Bed occupancy rate",
      "Clinical outcome metrics",
      "Regulatory compliance rate",
      "Cost per episode of care",
    ],
    commonRisks: [
      "Clinical safety and patient harm",
      "Regulatory non-compliance",
      "Data privacy (HIPAA, PDPL)",
      "Cybersecurity / ransomware on clinical systems",
      "Workforce burnout and attrition",
      "Reimbursement and billing disputes",
    ],
    documentTypes: [
      "Clinical audit reports",
      "Accreditation submissions",
      "Patient feedback and complaints",
      "Financial and billing reports",
      "Regulatory correspondence",
      "Incident reports",
    ],
    recommendedDashboards: ["ceo", "coo", "cto"],
    commonRecommendations: [
      "Implement patient flow optimisation to reduce wait times",
      "Strengthen cybersecurity controls on clinical systems",
      "Improve staff retention with structured recognition programmes",
      "Automate prior authorisation processes with payers",
    ],
    sensitivityDefault: "confidential",
  },

  real_estate_construction: {
    key: "real_estate_construction",
    label: "Real Estate / Construction",
    description: "Developers, property managers, contractors, and PropTech companies",
    subsectors: [
      { key: "residential_development", label: "Residential Development" },
      { key: "commercial_development", label: "Commercial Development" },
      { key: "property_management", label: "Property Management" },
      { key: "construction", label: "Construction & Contracting" },
      { key: "proptech", label: "PropTech" },
    ],
    defaultRoles: ["CEO", "CFO", "COO", "Project Director", "CBO", "Head of Facilities"],
    commonKPIs: [
      "Net Operating Income (NOI)",
      "Occupancy rate",
      "Project completion on time and on budget",
      "Return on capital employed (ROCE)",
      "Lease renewal rate",
      "Construction cost variance",
      "Pipeline GDV (Gross Development Value)",
    ],
    commonRisks: [
      "Cost overrun and project delays",
      "Planning and regulatory approval delays",
      "Interest rate exposure on project debt",
      "Contractor insolvency",
      "Environmental and ESG compliance",
      "Market pricing downturn",
    ],
    documentTypes: [
      "Project status reports",
      "Cost consultant reports (QS)",
      "Valuation reports",
      "Lease agreements",
      "Planning submissions",
      "Board investment papers",
    ],
    recommendedDashboards: ["ceo", "coo", "cbo"],
    commonRecommendations: [
      "Implement programme-level risk tracking across the development pipeline",
      "Negotiate fixed-price contracts where possible to reduce cost overrun exposure",
      "Increase ESG reporting capability ahead of regulatory requirements",
      "Build a diversified tenant mix to reduce occupancy concentration risk",
    ],
    sensitivityDefault: "confidential",
  },

  education_training: {
    key: "education_training",
    label: "Education / Training",
    description: "Schools, universities, edtech companies, and corporate training providers",
    subsectors: [
      { key: "k12", label: "K-12 / Schools" },
      { key: "higher_education", label: "Higher Education" },
      { key: "edtech", label: "EdTech Platform" },
      { key: "corporate_training", label: "Corporate Training" },
      { key: "vocational", label: "Vocational & Skills" },
    ],
    defaultRoles: ["CEO", "CFO", "COO", "Chief Academic Officer", "CMO", "CTO"],
    commonKPIs: [
      "Student enrolment growth",
      "Course completion rate",
      "Revenue per learner",
      "Net Promoter Score (NPS)",
      "Graduate employment rate",
      "Cost per student",
      "Content engagement rate",
    ],
    commonRisks: [
      "Declining enrolment",
      "Regulatory accreditation requirements",
      "Faculty / instructor retention",
      "Content quality and currency",
      "Technology adoption barriers",
      "Student data privacy (FERPA, PDPL)",
    ],
    documentTypes: [
      "Accreditation reports",
      "Student feedback surveys",
      "Financial performance reports",
      "Curriculum reviews",
      "Faculty and staff reports",
      "Government compliance submissions",
    ],
    recommendedDashboards: ["ceo", "coo", "cbo"],
    commonRecommendations: [
      "Launch blended learning formats to improve completion rates",
      "Build industry partnership programme to enhance graduate outcomes",
      "Invest in faculty development to reduce attrition",
      "Strengthen digital student engagement tools",
    ],
    sensitivityDefault: "internal",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ordered list of all sectors for UI display. */
export function getAllSectors(): SectorDefinition[] {
  return Object.values(SECTOR_LIBRARY);
}

/** Looks up a sector definition by key, returning undefined for unknown keys. */
export function getSector(key: string): SectorDefinition | undefined {
  return SECTOR_LIBRARY[key as SectorKey];
}

export function getArchetypeEvidenceExpectation(
  archetype?: string | null
): ArchetypeEvidenceExpectation | undefined {
  return archetype ? ARCHETYPE_EVIDENCE_EXPECTATIONS[archetype as CompanyArchetype] : undefined;
}

export function briefLanguageModeForArchetype(
  archetype?: string | null
): BriefLanguageMode {
  return archetype === "sme_physical" ? "plain" : "formal";
}

export function briefLanguageInstruction(
  mode: string | null | undefined,
  archetype?: string | null
): string {
  if (mode === "plain" || archetype === "sme_physical") {
    return [
      "Plain brief mode: write like a practical owner update, not a board paper.",
      "Use 2-3 short sentences maximum and one clear action.",
      "Avoid these terms: EBITDA, covenant compliance, IRR, capex, WACC, board pack, regulatory filing, capital adequacy, net present value.",
      "Use plain replacements: weekly profit, loan repayment terms, return on your investment, equipment spend, cost of borrowing, weekly business summary."
    ].join(" ");
  }

  if (archetype === "startup_scaleup" || archetype === "digital_native") {
    return "Startup/digital brief mode: use founder/operator language such as burn, runway, ARR, activation, CAC, retention, PLG, channel efficiency, and product velocity where evidence supports it. Avoid heavyweight corporate finance language unless the evidence uses it.";
  }

  return "Formal brief mode: use concise executive language with evidence refs, confidence, owner implications, and approval boundaries.";
}

/**
 * Builds a compact natural-language company context string to inject into
 * LLM prompts. Includes sector label, subsector, business model, stage,
 * employee band, region, primary goals, and risk profile.
 *
 * Keeps it under ~300 tokens to minimise prompt overhead.
 */
export function buildCompanyContext(profile: {
  companyName?: string | null;
  sector?: string | null;
  subsector?: string | null;
  businessModel?: string | null;
  companyStage?: string | null;
  employeeBand?: string | null;
  region?: string | null;
  primaryGoals?: string[] | null;
  riskProfile?: string | null;
  priorityRoles?: string[] | null;
  companyArchetype?: string | null;
  briefLanguageMode?: string | null;
}): string {
  const sector = profile.sector ? getSector(profile.sector) : undefined;

  const parts: string[] = [];

  if (profile.companyName) {
    parts.push(`Company: ${profile.companyName}`);
  }

  if (sector) {
    const subsectorLabel = profile.subsector
      ? sector.subsectors.find((s) => s.key === profile.subsector)?.label ?? profile.subsector
      : null;
    parts.push(
      `Sector: ${sector.label}${subsectorLabel ? ` (${subsectorLabel})` : ""}`
    );
  }

  if (profile.companyArchetype) {
    parts.push(`Archetype: ${profile.companyArchetype.replace(/_/g, " ")}`);
  }

  if (profile.briefLanguageMode) {
    parts.push(`Brief language: ${profile.briefLanguageMode}`);
  }

  const archetypeExpectation = getArchetypeEvidenceExpectation(profile.companyArchetype);
  if (archetypeExpectation) {
    parts.push(`Expected evidence for this archetype: ${archetypeExpectation.evidenceTypes.slice(0, 6).join(", ")}`);
  }

  parts.push(briefLanguageInstruction(profile.briefLanguageMode, profile.companyArchetype));

  if (profile.businessModel) {
    parts.push(`Business model: ${profile.businessModel}`);
  }

  if (profile.companyStage) {
    parts.push(`Stage: ${profile.companyStage}`);
  }

  if (profile.employeeBand) {
    parts.push(`Size: ${profile.employeeBand} employees`);
  }

  if (profile.region) {
    parts.push(`Region: ${profile.region}`);
  }

  if (profile.primaryGoals?.length) {
    parts.push(`Strategic goals: ${profile.primaryGoals.join(", ")}`);
  }

  if (profile.riskProfile) {
    parts.push(`Risk posture: ${profile.riskProfile}`);
  }

  if (sector) {
    parts.push(`Key KPIs for this sector: ${sector.commonKPIs.slice(0, 4).join(", ")}`);
    parts.push(`Common sector risks: ${sector.commonRisks.slice(0, 3).join(", ")}`);
  }

  if (!parts.length) return "";

  return `[Company Context]\n${parts.join("\n")}\n[/Company Context]`;
}
