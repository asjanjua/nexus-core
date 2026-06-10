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
    version: "1.0.0",
    owner: "NexusAI Product",
    description: "Company profile detection during onboarding.",
    template: `Classify the company from the user's description.
Return concise JSON with sector, subsector, business model, likely risks, suggested roles, and starter documents.
If uncertain, choose the closest practical operating model and explain the uncertainty.`,
    changelog: ["Introduced as onboarding prompt registry entry."],
    lastUpdated: "2026-06-10T00:00:00.000Z"
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
