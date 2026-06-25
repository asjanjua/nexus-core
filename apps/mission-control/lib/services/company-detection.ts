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
import { getPrompt } from "@/lib/prompts/registry";
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
// Prompts
//
// The detection and focus-mapping system prompts live in the prompt registry
// (keys `onboarding.company-detect` and `onboarding.focus-map`) so they are
// versioned, centrally owned, and audited via `prompt_rendered` events. Pass an
// `audit` context (workspaceId) so each render is attributable.
// ---------------------------------------------------------------------------

type PromptAudit = { workspaceId?: string; actor?: string };

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function detectCompanyProfile(
  description: string,
  audit?: PromptAudit
): Promise<DetectedProfile | null> {
  if (!description?.trim() || description.trim().length < 10) return null;

  const systemPrompt = getPrompt("onboarding.company-detect", {}, { ...audit, route: "company_detection" });
  const userPrompt = `Company description:\n"${description.trim()}"\n\nGenerate the company profile JSON.`;

  let raw: string;
  try {
    raw = await ask(userPrompt, systemPrompt, {
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

export async function mapFocusToDashboard(
  intent: string,
  companyContext: string,
  audit?: PromptAudit
): Promise<FocusMapping | null> {
  if (!intent?.trim() || intent.trim().length < 5) return null;

  const systemPrompt = getPrompt("onboarding.focus-map", {}, { ...audit, route: "company_focus" });
  const userPrompt = companyContext
    ? `${companyContext}\n\nUser focus: "${intent.trim()}"\n\nMap this to dashboards and suggest first questions.`
    : `User focus: "${intent.trim()}"\n\nMap this to dashboards and suggest first questions.`;

  let raw: string;
  try {
    raw = await ask(userPrompt, systemPrompt, {
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
