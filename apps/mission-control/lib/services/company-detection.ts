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
import { companyArchetypeSchema, type CompanyArchetype, type WorkspaceRoleState } from "@/lib/contracts";
import { roleStatesFromSuggestions, suggestRolesForProfile } from "@/lib/services/role-suggestion";
import { getDefaultDocuments, type SuggestedDocument } from "@/lib/services/company-classification";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectedProfile = {
  companyName: string | null;
  sector: string;
  sectorLabel: string;
  subsector: string;
  businessModel: string;
  companyArchetype: CompanyArchetype;
  archetypeVersion?: string | null;
  companyStage: string;
  employeeBand: string;
  region: string;
  primaryGoals: string[];
  riskProfile: string;
  priorityRoles: string[];
  suggestedRoleReasons: Record<string, string>;
  stagedRoles: Array<{ roleKey: string; label: string; activationCondition: string }>;
  roleStates: Record<string, WorkspaceRoleState>;
  locationCount?: number;
  requiresRoleConfirmation: boolean;
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
  "companyArchetype": "corporate | startup_scaleup | sme_physical | digital_native | professional_practice",
  "companyStage": "pre_revenue | early_stage | growth | scale_up | enterprise | public",
  "employeeBand": "1_10 | 11_50 | 51_200 | 201_1000 | 1001_5000 | 5000_plus",
  "region": "plain language region (e.g. 'GCC', 'Pakistan', 'Southeast Asia', 'North America', 'Europe')",
  "primaryGoals": ["array of up to 4 keys from: revenue_growth, cost_reduction, regulatory_compliance, market_expansion, digital_transformation, risk_management, talent_retention, product_launch"],
  "riskProfile": "conservative | moderate | growth_oriented | aggressive",
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
- companyArchetype must be one of the 5 keys listed. Use sme_physical for owner-operated shops, restaurants, clinics, branches, and other physical-location businesses. Use digital_native for internet-first, ads/social-driven, SaaS, D2C, marketplace, creator, or PLG companies. Use professional_practice for partnership-led advisory, law, accounting, consulting, and agencies. Use startup_scaleup for founder-led companies where stage matters more than formal titles. Use corporate for formal C-suite, regulated, mature, or board-governed companies.
- Suggest exactly 5 documents tailored to this company type and stage. Be specific (e.g. 'Board pack Q2 2026' not 'Board pack').
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
      temperature: 0.1,
      route: "company_detection",
      surfaceId: "ingestion_triage_assist"
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
  const archetypeParsed = companyArchetypeSchema.safeParse(parsed.companyArchetype);
  const companyArchetype = archetypeParsed.success
    ? archetypeParsed.data
    : sectorDef?.key === "professional_services"
      ? "professional_practice"
      : sectorDef?.key === "retail_commerce"
        ? "digital_native"
        : sectorDef?.key === "financial_services" || sectorDef?.key === "healthcare"
          ? "corporate"
          : "startup_scaleup";

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

  const confidence = typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7;
  const roleSuggestions = suggestRolesForProfile({
    sector: sectorDef?.key ?? "technology_saas",
    companyArchetype,
    businessModel: typeof parsed.businessModel === "string" ? parsed.businessModel : "b2b",
    companyStage: typeof parsed.companyStage === "string" ? parsed.companyStage : "growth",
    employeeBand: typeof parsed.employeeBand === "string" ? parsed.employeeBand : "51_200",
    region: typeof parsed.region === "string" ? parsed.region : "",
    primaryGoals: toStrArray(parsed.primaryGoals),
    riskProfile: typeof parsed.riskProfile === "string" ? parsed.riskProfile : "moderate",
    description
  });
  const activeRoles = roleSuggestions.filter((role) => role.state === "active");
  const stagedRoles = roleSuggestions
    .filter((role) => role.state === "staged")
    .map((role) => ({
      roleKey: role.roleKey,
      label: role.label,
      activationCondition: role.stagedCondition ?? "Activates as the company grows."
    }));

  return {
    companyName: typeof parsed.companyName === "string" && parsed.companyName ? parsed.companyName : null,
    sector: sectorDef?.key ?? "technology_saas",
    sectorLabel: sectorDef?.label ?? String(parsed.sector ?? ""),
    subsector: typeof parsed.subsector === "string" ? parsed.subsector : "",
    businessModel: typeof parsed.businessModel === "string" ? parsed.businessModel : "b2b",
    companyArchetype,
    companyStage: typeof parsed.companyStage === "string" ? parsed.companyStage : "growth",
    employeeBand: typeof parsed.employeeBand === "string" ? parsed.employeeBand : "51_200",
    region: typeof parsed.region === "string" ? parsed.region : "",
    primaryGoals: toStrArray(parsed.primaryGoals),
    riskProfile: typeof parsed.riskProfile === "string" ? parsed.riskProfile : "moderate",
    priorityRoles: activeRoles.map((role) => role.roleKey),
    suggestedRoleReasons: Object.fromEntries(roleSuggestions.map((role) => [role.roleKey, role.reason])),
    stagedRoles,
    roleStates: roleStatesFromSuggestions(roleSuggestions),
    requiresRoleConfirmation: confidence < 0.5 || !archetypeParsed.success,
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
    confidence,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : ""
  };
}

// ---------------------------------------------------------------------------
// Focus mapping — maps user's stated priority to dashboards + first questions
// ---------------------------------------------------------------------------

export type FocusMapping = {
  recommendedDashboards: string[]; // keys from: ceo, coo, cbo, cto
  suggestedQuestions: string[];    // 3–5 specific first questions for the Ask panel
  focusSummary: string;            // one sentence description of what Nexus will monitor
};

const FOCUS_SYSTEM_PROMPT = `You are the NexusAI onboarding strategist. A user has described what they want executive intelligence help with.
Your job is to map their intent to the right role dashboards and suggest specific first questions they can ask Nexus.

Respond ONLY with valid JSON. No markdown, no extra text.

Format:
{
  "recommendedDashboards": ["ceo"],
  "suggestedQuestions": [
    "What is blocking revenue growth this quarter?",
    "Which operational risks need immediate CEO attention?",
    "What is the status of our top strategic initiative?"
  ],
  "focusSummary": "Monitoring growth blockers, strategic risks, and cross-functional bottlenecks for the CEO lens."
}

Dashboard keys available: ceo (strategy, risks, open decisions), coo (operations, delivery, execution), cbo (commercial, BD pipeline, growth), cto (technology, data quality, security, infrastructure).
Rules:
- Recommend 1-3 dashboards most relevant to the stated focus.
- Suggest exactly 3 questions that are specific, actionable, and answerable from business documents.
- focusSummary must be one clear sentence.
- Questions should reflect both the user's stated intent AND the company's sector/stage if provided.`;

export async function mapFocusToDashboard(
  intent: string,
  companyContext: string
): Promise<FocusMapping | null> {
  if (!intent?.trim() || intent.trim().length < 5) return null;

  const userPrompt = companyContext
    ? `${companyContext}\n\nUser focus: "${intent.trim()}"\n\nMap this to dashboards and suggest first questions.`
    : `User focus: "${intent.trim()}"\n\nMap this to dashboards and suggest first questions.`;

  let raw: string;
  try {
    raw = await ask(userPrompt, FOCUS_SYSTEM_PROMPT, {
      maxTokens: 400,
      temperature: 0.15,
      route: "company_focus",
      surfaceId: "ingestion_triage_assist"
    });
  } catch {
    return null;
  }

  if (!raw || raw.includes("[LLM unavailable")) return null;

  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const dashboards = toStrArray(parsed.recommendedDashboards)
    .filter((d) => ["ceo", "coo", "cbo", "cto"].includes(d))
    .slice(0, 3);

  const questions = toStrArray(parsed.suggestedQuestions).slice(0, 5);

  if (!dashboards.length || !questions.length) return null;

  return {
    recommendedDashboards: dashboards,
    suggestedQuestions: questions,
    focusSummary: typeof parsed.focusSummary === "string" ? parsed.focusSummary : ""
  };
}
