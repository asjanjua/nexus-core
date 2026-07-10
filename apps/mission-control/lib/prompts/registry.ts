import type { PromptRegistryEntry } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

type PromptVariables = Record<string, string | number | boolean | null | undefined>;

export const PROMPT_REGISTRY: Record<string, PromptRegistryEntry> = {
  "ask.synthesis": {
    key: "ask.synthesis",
    version: "1.0.0",
    owner: "NexusAI Trust",
    description: "Evidence-grounded Ask answer synthesis for executive users.",
    template: `You are a senior executive intelligence analyst embedded in NexusAI Mission Control.
Your job is to answer executive questions concisely and precisely, grounded only in the evidence provided.

Rules:
- Answer in 3-5 sentences unless the question demands more detail.
- Reference specific facts from the evidence. Do not speculate beyond what is in the evidence.
- If the evidence is insufficient, say so explicitly and explain what is missing.
- Use professional, executive-ready language. No bullet points unless listing distinct items.
- End with a confidence note: e.g. "Evidence confidence: 84%."`,
    changelog: ["Initial registry entry extracted from retrieval service."],
    lastUpdated: "2026-06-10T00:00:00.000Z"
  },
  "dashboard.agent-brief": {
    key: "dashboard.agent-brief",
    version: "1.0.0",
    owner: "NexusAI Trust",
    description: "Role and specialist-agent dashboard brief synthesis.",
    template: `You are generating a NexusAI executive brief for {{roleName}}.
Use only the provided evidence. Summarize the bigger picture, current risks, decisions needed, and recommended next action.
Keep the tone board-ready, practical, and evidence-first.`,
    changelog: ["Introduced as the dashboard prompt manifest entry."],
    lastUpdated: "2026-06-10T00:00:00.000Z"
  },
  "onboarding.company-detect": {
    key: "onboarding.company-detect",
    version: "1.1.0",
    owner: "NexusAI Product",
    description: "Company profile detection during onboarding. Full system prompt: infers sector, archetype, stage, roles, starter documents, KPIs, risks, and sensitivity defaults as strict JSON.",
    template: `You are a senior business analyst at NexusAI. Given a company description, infer a structured company profile.

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
- Be sector-aware and specific. Generic suggestions are not acceptable.`,
    changelog: [
      "Introduced as onboarding prompt registry entry.",
      "1.1.0 (2026-06-25): replaced stub with the full detection system prompt migrated from company-detection.ts; now versioned and audited via prompt_rendered events."
    ],
    lastUpdated: "2026-06-25T00:00:00.000Z"
  },
  "onboarding.focus-map": {
    key: "onboarding.focus-map",
    version: "1.0.0",
    owner: "NexusAI Product",
    description: "Onboarding strategist: maps a user's stated focus intent to recommended role dashboards and 3 specific first questions, as strict JSON.",
    template: `You are the NexusAI onboarding strategist. A user has described what they want executive intelligence help with.
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
- Questions should reflect both the user's stated intent AND the company's sector/stage if provided.`,
    changelog: ["1.0.0 (2026-06-25): migrated from company-detection.ts FOCUS_SYSTEM_PROMPT into the registry; now versioned and audited."],
    lastUpdated: "2026-06-25T00:00:00.000Z"
  },
  "decision.extract": {
    key: "decision.extract",
    version: "1.0.0",
    owner: "NexusAI Workflow Twins",
    description: "Extract decision/action candidates from agent outputs.",
    template: `Extract possible decisions and action items from the provided agent output.
Return only items with clear evidence, owner or likely owner, rationale, priority, and source references.
Do not create canonical records; humans approve all extracted candidates.`,
    changelog: ["Introduced as Decision Twin prompt registry entry."],
    lastUpdated: "2026-06-10T00:00:00.000Z"
  },
  "synthesis.executive": {
    key: "synthesis.executive",
    version: "1.0.0",
    owner: "NexusAI Product",
    description: "Cross-agent executive synthesis — answers role-specific leadership questions grounded in specialist agent briefs.",
    template: `You are an executive intelligence analyst inside NexusAI Mission Control.
Answer one specific executive question based only on the specialist agent briefs and evidence provided.
Answer in 2-5 sentences. Be direct. Ground every statement in facts. No speculation.
If no relevant evidence exists, say: "Insufficient evidence to answer this question."
Use executive-ready language matching the company context.`,
    changelog: ["Introduced as Executive Synthesis Layer prompt — v0.18.0."],
    lastUpdated: "2026-06-10T00:00:00.000Z"
  }
};

export function listPromptRegistry(): PromptRegistryEntry[] {
  return Object.values(PROMPT_REGISTRY).sort((a, b) => a.key.localeCompare(b.key));
}

export function getPrompt(
  key: string,
  variables: PromptVariables = {},
  audit?: { workspaceId?: string; route?: string; actor?: string }
): string {
  const entry = PROMPT_REGISTRY[key];
  if (!entry) throw new Error(`unknown_prompt_key:${key}`);

  const rendered = entry.template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, name: string) => {
    if (!(name in variables)) throw new Error(`missing_prompt_variable:${key}:${name}`);
    return String(variables[name] ?? "");
  });

  if (audit?.workspaceId) {
    repository.pushAudit({
      workspaceId: audit.workspaceId,
      type: "prompt_rendered",
      actor: audit.actor ?? "prompt_registry",
      payload: {
        promptKey: entry.key,
        promptVersion: entry.version,
        route: audit.route ?? "unknown"
      }
    }).catch(() => undefined);
  }

  return rendered;
}

export async function syncPromptRegistry(): Promise<void> {
  await repository.upsertPromptRegistry(listPromptRegistry());
}
