/**
 * AI-powered company profile detection service.
 *
 * Given a free-text company description, the LLM infers:
 *   - Sector + subsector classification
 *   - Business model, stage, region
 *   - Priority C-suite roles
 *   - Document starter pack (5 recommended uploads)
 *   - Relevant KPIs and risks
 *   - Recommended sensitivity defaults
 *
 * Falls back to null when the LLM is unavailable so the wizard
 * can still proceed with manual selection.
 */

import { ask } from "@/lib/services/llm";
import { getSector } from "@/lib/domain/sector-library";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestedDocument = {
  name: string;
  type: "pdf" | "docx" | "xlsx" | "txt" | "md" | "pptx";
  priority: "high" | "medium";
  description: string;
};

export type DetectedProfile = {
  companyName: string | null;
  sector: string;
  sectorLabel: string;
  subsector: string;
  businessModel: string;
  companyStage: string;
  employeeBand: string;
  region: string;
  primaryGoals: string[];
  riskProfile: string;
  priorityRoles: string[];
  suggestedDocuments: SuggestedDocument[];
  suggestedKPIs: string[];
  suggestedRisks: string[];
  sensitivityDefault: "internal" | "confidential";
  confidence: number;
  reasoning: string;
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const DETECTION_SYSTEM_PROMPT = `You are a senior business analyst at NexusAI. Given a company description, infer a structured company profile.

Respond ONLY with a valid JSON object. No markdown code fences, no explanatory text outside the JSON.

Required format:
{
  "companyName": "string or null",
  "sector": "financial_services | professional_services | technology_saas | manufacturing | retail_commerce | healthcare | real_estate_construction | education_training",
  "subsector": "brief label describing the company's niche (e.g. 'Digital Banking / Neobank', 'B2B SaaS', 'Merchant Acquiring')",
  "businessModel": "b2b | b2c | b2b2c | marketplace | services | government",
  "companyStage": "pre_revenue | early_stage | growth | scale_up | enterprise | public",
  "employeeBand": "1_10 | 11_50 | 51_200 | 201_1000 | 1001_5000 | 5000_plus",
  "region": "plain language region (e.g. 'GCC', 'Pakistan', 'Southeast Asia', 'North America', 'Europe')",
  "primaryGoals": ["array of up to 4 keys from: revenue_growth, cost_reduction, regulatory_compliance, market_expansion, digital_transformation, risk_management, talent_retention, product_launch"],
  "riskProfile": "conservative | moderate | growth_oriented | aggressive",
  "priorityRoles": ["array of relevant C-suite titles, e.g. CEO, CFO, COO, CTO, CRO, CMO, CPO, CBO, Risk/Compliance"],
  "suggestedDocuments": [
    {
      "name": "Document name (specific, not generic)",
      "type": "pdf | docx | xlsx | txt | md | pptx",
      "priority": "high | medium",
      "description": "Why this matters for leadership in this sector (1 sentence)"
    }
  ],
  "suggestedKPIs": ["KPI 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5"],
  "suggestedRisks": ["Risk 1 (specific)", "Risk 2 (specific)", "Risk 3 (specific)"],
  "sensitivityDefault": "internal | confidential",
  "confidence": 0.0,
  "reasoning": "2-3 sentences explaining your classification"
}

Rules:
- sector must be exactly one of the 8 keys listed.
- Suggest exactly 5 documents tailored to this company type and stage. Be specific (e.g. 'Board pack Q2 2026' not 'Board pack').
- priorityRoles: include 4-6 most relevant roles. Include 'Risk/Compliance' for regulated industries.
- sensitivityDefault: use 'confidential' for financial services, healthcare, and legal/regulated sectors. Use 'internal' for others.
- confidence: 0.8+ for clear descriptions, 0.5-0.8 for ambiguous, 0.3-0.5 for very thin descriptions.
- riskProfile: 'conservative' for regulated industries, 'moderate' for established companies, 'growth_oriented' for scale-ups, 'aggressive' for early-stage startups.
- Be sector-aware and specific. Generic suggestions are not acceptable.`;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function detectCompanyProfile(description: string): Promise<DetectedProfile | null> {
  if (!description?.trim() || description.trim().length < 10) return null;

  const userPrompt = `Company description:\n"${description.trim()}"\n\nGenerate the company profile JSON.`;

  let raw: string;
  try {
    raw = await ask(userPrompt, DETECTION_SYSTEM_PROMPT, {
      maxTokens: 800,
      temperature: 0.1
    });
  } catch {
    return null;
  }

  if (!raw || raw.includes("[LLM unavailable")) return null;

  // Strip markdown fences if the model adds them
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  // Validate sector key
  const sector = typeof parsed.sector === "string" ? parsed.sector : "";
  const sectorDef = getSector(sector);

  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const toDocArray = (v: unknown): SuggestedDocument[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((d) => d && typeof d === "object" && typeof d.name === "string")
      .slice(0, 5)
      .map((d) => ({
        name: String(d.name ?? ""),
        type: (["pdf", "docx", "xlsx", "txt", "md", "pptx"].includes(String(d.type ?? ""))
          ? d.type
          : "pdf") as SuggestedDocument["type"],
        priority: (["high", "medium"].includes(String(d.priority ?? "")) ? d.priority : "medium") as SuggestedDocument["priority"],
        description: String(d.description ?? "")
      }));
  };

  return {
    companyName: typeof parsed.companyName === "string" && parsed.companyName ? parsed.companyName : null,
    sector: sectorDef?.key ?? "technology_saas",
    sectorLabel: sectorDef?.label ?? String(parsed.sector ?? ""),
    subsector: typeof parsed.subsector === "string" ? parsed.subsector : "",
    businessModel: typeof parsed.businessModel === "string" ? parsed.businessModel : "b2b",
    companyStage: typeof parsed.companyStage === "string" ? parsed.companyStage : "growth",
    employeeBand: typeof parsed.employeeBand === "string" ? parsed.employeeBand : "51_200",
    region: typeof parsed.region === "string" ? parsed.region : "",
    primaryGoals: toStrArray(parsed.primaryGoals),
    riskProfile: typeof parsed.riskProfile === "string" ? parsed.riskProfile : "moderate",
    priorityRoles: toStrArray(parsed.priorityRoles).length > 0 ? toStrArray(parsed.priorityRoles) : ["CEO", "CFO", "COO", "CTO"],
    suggestedDocuments: toDocArray(parsed.suggestedDocuments).length > 0
      ? toDocArray(parsed.suggestedDocuments)
      : getDefaultDocuments(sectorDef?.key ?? ""),
    suggestedKPIs: toStrArray(parsed.suggestedKPIs).length > 0
      ? toStrArray(parsed.suggestedKPIs)
      : sectorDef?.commonKPIs.slice(0, 5) ?? [],
    suggestedRisks: toStrArray(parsed.suggestedRisks).length > 0
      ? toStrArray(parsed.suggestedRisks)
      : sectorDef?.commonRisks.slice(0, 3) ?? [],
    sensitivityDefault: parsed.sensitivityDefault === "confidential" ? "confidential" : "internal",
    confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : ""
  };
}

// ---------------------------------------------------------------------------
// Filename-based file classifier (fast, no LLM needed)
// ---------------------------------------------------------------------------

export type FileClassification = {
  department: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
};

export function classifyFilename(filename: string, sector = ""): FileClassification {
  const lower = filename.toLowerCase();

  // Department detection by keyword patterns
  let department = "General";
  if (/board|steering|exec|c-suite|ceo|coo|cfo|townhall/i.test(lower)) {
    department = "Executive / Strategy";
  } else if (/risk|compliance|regulatory|audit|legal|aml|kyc|policy|procedure|control/i.test(lower)) {
    department = "Risk & Compliance";
  } else if (/financ|budget|p&l|revenue|cost|cashflow|forecast|invoice|expense|margin/i.test(lower)) {
    department = "Finance";
  } else if (/sales|pipeline|crm|deal|commercial|bd|partnership|proposal|quote|prospect/i.test(lower)) {
    department = "Commercial / Sales";
  } else if (/tech|engineer|system|infra|security|devops|architect|cloud|incident|postmortem|sla/i.test(lower)) {
    department = "Technology";
  } else if (/ops|operation|kpi|perform|delivery|logistics|process|workflow|sop/i.test(lower)) {
    department = "Operations";
  } else if (/market|brand|campaign|seo|content|social|launch|pr/i.test(lower)) {
    department = "Marketing";
  } else if (/hr|talent|people|hiring|org|culture|payroll|headcount|attrition/i.test(lower)) {
    department = "HR / People";
  } else if (/strategy|roadmap|plan|vision|okr|goal/i.test(lower)) {
    department = "Strategy";
  } else if (/product|feature|sprint|backlog|user|ux|design/i.test(lower)) {
    department = "Product";
  }

  // Sensitivity detection
  let sensitivity: FileClassification["sensitivity"] = "internal";

  // Highly sensitive patterns
  if (/board|legal|salary|payroll|personal|pii|gdpr|restricted|confidential/i.test(lower)) {
    sensitivity = "confidential";
  }
  if (/password|credential|secret|token|api.?key/i.test(lower)) {
    sensitivity = "restricted";
  }

  // Sector-based elevation
  if (
    (sector === "financial_services" || sector === "healthcare") &&
    sensitivity === "internal"
  ) {
    // Elevate regulated-sector defaults to confidential for anything non-public
    if (!/public|press|release|marketing|blog/i.test(lower)) {
      sensitivity = "confidential";
    }
  }

  return { department, sensitivity };
}

// ---------------------------------------------------------------------------
// Default document starter packs per sector
// ---------------------------------------------------------------------------

function getDefaultDocuments(sector: string): SuggestedDocument[] {
  const packs: Record<string, SuggestedDocument[]> = {
    financial_services: [
      { name: "Latest Board Pack", type: "pdf", priority: "high", description: "Strategic context and board-level risk signals" },
      { name: "Risk Register", type: "xlsx", priority: "high", description: "Current risk inventory and mitigation status" },
      { name: "Regulatory Compliance Report", type: "pdf", priority: "high", description: "Regulatory obligations, gaps, and pending actions" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "P&L, KPIs, and variance to plan" },
      { name: "AML/KYC Policy Manual", type: "docx", priority: "medium", description: "Compliance procedures and control framework" }
    ],
    professional_services: [
      { name: "Business Development Pipeline", type: "xlsx", priority: "high", description: "Proposal pipeline, win rates, and revenue forecast" },
      { name: "Client Engagement Status Report", type: "docx", priority: "high", description: "Active projects, delivery status, and issues" },
      { name: "Monthly P&L by Practice Area", type: "xlsx", priority: "high", description: "Revenue, margin, and utilisation by team" },
      { name: "Resource Utilisation Report", type: "xlsx", priority: "medium", description: "Billable vs non-billable hours and capacity" },
      { name: "Partner / Client Meeting Notes", type: "docx", priority: "medium", description: "Key decisions and relationship signals" }
    ],
    technology_saas: [
      { name: "Product Roadmap", type: "pdf", priority: "high", description: "Feature priorities, timelines, and strategic bets" },
      { name: "Monthly MRR / ARR Report", type: "xlsx", priority: "high", description: "Revenue growth, churn, and expansion metrics" },
      { name: "Engineering Sprint Report", type: "docx", priority: "medium", description: "Velocity, blockers, and technical debt signals" },
      { name: "Security Audit Report", type: "pdf", priority: "high", description: "Vulnerabilities, risks, and remediation plan" },
      { name: "Customer NPS / Feedback Analysis", type: "xlsx", priority: "medium", description: "User satisfaction trends and churn signals" }
    ],
    manufacturing: [
      { name: "Production KPI Report", type: "xlsx", priority: "high", description: "OEE, defect rates, and capacity utilisation" },
      { name: "Supply Chain Risk Register", type: "xlsx", priority: "high", description: "Supplier risk, lead times, and buffer stock" },
      { name: "Quality Audit Report", type: "pdf", priority: "high", description: "Non-conformances, corrective actions, and compliance" },
      { name: "Maintenance and Incident Log", type: "xlsx", priority: "medium", description: "Equipment failures and downtime trends" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "COGS, margin, and variance to plan" }
    ],
    retail_commerce: [
      { name: "Weekly Trading Report", type: "xlsx", priority: "high", description: "Sales, conversion, and category performance" },
      { name: "Inventory Aging Report", type: "xlsx", priority: "high", description: "Stock levels, slow-movers, and write-off risk" },
      { name: "Customer Feedback / NPS Survey", type: "xlsx", priority: "medium", description: "Satisfaction trends and churn signals" },
      { name: "Supplier Scorecard", type: "xlsx", priority: "medium", description: "Delivery performance and compliance" },
      { name: "Campaign Performance Report", type: "pdf", priority: "medium", description: "Marketing ROI and channel attribution" }
    ],
    healthcare: [
      { name: "Clinical Audit Report", type: "pdf", priority: "high", description: "Patient outcomes, safety incidents, and quality metrics" },
      { name: "Regulatory Compliance Status", type: "docx", priority: "high", description: "Accreditation gaps and regulatory obligations" },
      { name: "Financial and Billing Report", type: "xlsx", priority: "high", description: "Revenue cycle, reimbursement, and cost per episode" },
      { name: "Patient Satisfaction Report", type: "pdf", priority: "medium", description: "CSAT, NPS, and complaint analysis" },
      { name: "Incident and Risk Register", type: "xlsx", priority: "high", description: "Patient safety events and mitigation actions" }
    ],
    real_estate_construction: [
      { name: "Project Status Report", type: "docx", priority: "high", description: "Delivery milestones, cost variance, and blockers" },
      { name: "QS Cost Report", type: "xlsx", priority: "high", description: "Budget, committed costs, and forecast at completion" },
      { name: "Occupancy and Leasing Report", type: "xlsx", priority: "high", description: "Occupancy rates, lease renewals, and pipeline" },
      { name: "Board Investment Paper", type: "pdf", priority: "high", description: "Strategic rationale, returns, and risk for key decisions" },
      { name: "Environmental / ESG Report", type: "pdf", priority: "medium", description: "Sustainability compliance and ESG obligations" }
    ],
    education_training: [
      { name: "Student Enrolment Report", type: "xlsx", priority: "high", description: "Enrolment trends, growth, and forecast" },
      { name: "Accreditation Status Report", type: "docx", priority: "high", description: "Compliance status and upcoming requirements" },
      { name: "Financial Performance Report", type: "xlsx", priority: "high", description: "Revenue, cost per student, and budget variance" },
      { name: "Student Feedback / NPS", type: "xlsx", priority: "medium", description: "Satisfaction trends and at-risk cohort signals" },
      { name: "Faculty / Staff Report", type: "docx", priority: "medium", description: "Headcount, attrition, and development needs" }
    ]
  };

  return packs[sector] ?? packs.technology_saas;
}
