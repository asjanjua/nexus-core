/**
 * NexusAI model routing policy.
 *
 * This file is intentionally declarative. It captures the routing contract
 * we want the manager/orchestrator layer to enforce as Nexus grows beyond a
 * single hard-coded LLM call path.
 *
 * Important current-state note:
 * - Mission Control runtime currently supports Anthropic directly.
 * - OpenAI and Azure OpenAI are exposed in workspace settings, but the shared
 *   LLM execution path has not yet been generalized beyond Anthropic.
 * - Experimental low-cost models are documented here for policy clarity, not
 *   enabled by default in V1.
 */

export type NexusMode = "ask" | "think" | "make" | "run";

export type ModelTier = "economy" | "standard" | "premium" | "restricted_safe";

export type ProviderId =
  | "anthropic"
  | "openai"
  | "azure_openai"
  | "experimental_gateway";

export type SurfaceId =
  | "ask_web_quick"
  | "ask_slack_brief"
  | "dashboard_cards"
  | "recommendation_draft"
  | "recommendation_final"
  | "decision_memo"
  | "daily_executive_brief"
  | "ingestion_triage_assist"
  | "review_queue_assist"
  | "audit_refusal";

export type DataClass = "public" | "internal" | "confidential" | "restricted";

export type RoutePolicy = {
  id: SurfaceId;
  mode: NexusMode;
  purpose: string;
  userVisible: boolean;
  allowedDataClasses: DataClass[];
  defaultTier: ModelTier;
  allowedTiers: ModelTier[];
  fallbackChain: Array<{
    provider: ProviderId;
    model: string;
    tier: ModelTier;
    enabledNow: boolean;
  }>;
  draftRefineFlow: "single_pass" | "draft_then_refine";
  confidenceFloor: number;
  requiresApprovalBeforeUse: boolean;
  notes: string;
};

export type ProviderProfile = {
  id: ProviderId;
  label: string;
  enabledNow: boolean;
  currentRuntimeSupported: boolean;
  bestUse: string[];
  notFor: string[];
  defaultModels: Partial<Record<ModelTier, string>>;
  policyNotes: string;
};

export const PROVIDER_PROFILES: Record<ProviderId, ProviderProfile> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    enabledNow: true,
    currentRuntimeSupported: true,
    bestUse: [
      "final executive outputs",
      "role dashboard synthesis",
      "decision memos",
      "high-trust recommendation refinement"
    ],
    notFor: [],
    defaultModels: {
      economy: "claude-haiku-4-5-20251001",
      standard: "claude-sonnet-4-6",
      premium: "claude-opus-4-6",
      restricted_safe: "claude-sonnet-4-6"
    },
    policyNotes:
      "Primary Nexus V1 provider. Best fit for evidence-backed executive synthesis."
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    enabledNow: false,
    currentRuntimeSupported: false,
    bestUse: [
      "future alternate premium route",
      "comparative evals",
      "fallback if generalized provider layer is added"
    ],
    notFor: ["assumed live production routing in current runtime"],
    defaultModels: {
      standard: "gpt-4o",
      premium: "gpt-4o"
    },
    policyNotes:
      "Visible in settings, but not yet wired into the shared runtime execution path."
  },
  azure_openai: {
    id: "azure_openai",
    label: "Azure OpenAI",
    enabledNow: false,
    currentRuntimeSupported: false,
    bestUse: [
      "future enterprise deployments with Azure procurement or policy requirements"
    ],
    notFor: ["assumed live production routing in current runtime"],
    defaultModels: {
      standard: "gpt-4o",
      premium: "gpt-4o"
    },
    policyNotes:
      "Reserved for enterprise environments that require Azure-hosted model access."
  },
  experimental_gateway: {
    id: "experimental_gateway",
    label: "Experimental Gateway Models",
    enabledNow: false,
    currentRuntimeSupported: false,
    bestUse: [
      "low-cost preprocessing",
      "non-final draft generation",
      "large-volume internal classification"
    ],
    notFor: [
      "restricted data",
      "final executive output",
      "high-impact recommendations",
      "approval narratives"
    ],
    defaultModels: {
      economy: "deepseek-v4-flash or qwen-flash equivalent via gateway"
    },
    policyNotes:
      "This bucket covers very low-cost models, including Chinese providers routed through a gateway. V1 policy keeps them disabled by default and excludes them from sponsor-facing outputs."
  }
};

export const NEXUS_MODEL_ROUTING: RoutePolicy[] = [
  {
    id: "ask_web_quick",
    mode: "ask",
    purpose: "Web Ask answers for evidence-backed retrieval and concise analysis.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "standard",
    allowedTiers: ["standard", "premium", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "standard",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-opus-4-6",
        tier: "premium",
        enabledNow: true
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.55,
    requiresApprovalBeforeUse: false,
    notes:
      "Default Ask route. Escalate to premium when confidence is low or the question is clearly strategic."
  },
  {
    id: "ask_slack_brief",
    mode: "ask",
    purpose: "Short Slack answers and follow-up replies on governed secondary surfaces.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential"],
    defaultTier: "standard",
    allowedTiers: ["standard", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "restricted_safe",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        tier: "economy",
        enabledNow: true
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.6,
    requiresApprovalBeforeUse: false,
    notes:
      "Slack remains a summary surface. Restricted content stays out even if it exists in Mission Control."
  },
  {
    id: "dashboard_cards",
    mode: "think",
    purpose: "Role-aware dashboard card synthesis from the shared evidence base.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "premium",
    allowedTiers: ["standard", "premium", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-opus-4-6",
        tier: "premium",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "standard",
        enabledNow: true
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.65,
    requiresApprovalBeforeUse: false,
    notes:
      "Dashboard outputs are sponsor-visible and must stay high-trust. Use premium first."
  },
  {
    id: "recommendation_draft",
    mode: "make",
    purpose: "Internal draft recommendation generation before human review.",
    userVisible: false,
    allowedDataClasses: ["public", "internal", "confidential"],
    defaultTier: "economy",
    allowedTiers: ["economy", "standard"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        tier: "economy",
        enabledNow: true
      },
      {
        provider: "experimental_gateway",
        model: "deepseek-v4-flash or qwen-flash equivalent via gateway",
        tier: "economy",
        enabledNow: false
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "standard",
        enabledNow: true
      }
    ],
    draftRefineFlow: "draft_then_refine",
    confidenceFloor: 0.45,
    requiresApprovalBeforeUse: false,
    notes:
      "This is the main place where low-cost models can help later, but only for non-final internal drafts."
  },
  {
    id: "recommendation_final",
    mode: "make",
    purpose: "Final recommendation narrative that will enter approval flow or sponsor-facing packs.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "premium",
    allowedTiers: ["standard", "premium", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-opus-4-6",
        tier: "premium",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "restricted_safe",
        enabledNow: true
      }
    ],
    draftRefineFlow: "draft_then_refine",
    confidenceFloor: 0.7,
    requiresApprovalBeforeUse: true,
    notes:
      "High-impact outputs must not use experimental low-cost models in their final pass."
  },
  {
    id: "decision_memo",
    mode: "run",
    purpose: "Decision memo generation for executive review and downstream approval.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "premium",
    allowedTiers: ["premium", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-opus-4-6",
        tier: "premium",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "restricted_safe",
        enabledNow: true
      }
    ],
    draftRefineFlow: "draft_then_refine",
    confidenceFloor: 0.75,
    requiresApprovalBeforeUse: true,
    notes:
      "Decision memos are among the highest-trust artifacts in V1."
  },
  {
    id: "daily_executive_brief",
    mode: "make",
    purpose: "Daily or weekly executive brief exports and digest summaries.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential"],
    defaultTier: "premium",
    allowedTiers: ["standard", "premium"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-opus-4-6",
        tier: "premium",
        enabledNow: true
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "standard",
        enabledNow: true
      }
    ],
    draftRefineFlow: "draft_then_refine",
    confidenceFloor: 0.68,
    requiresApprovalBeforeUse: true,
    notes:
      "Briefs are sponsor-facing and should optimize for coherence over cheapest-token routing."
  },
  {
    id: "ingestion_triage_assist",
    mode: "make",
    purpose: "Internal triage assistance for labeling, summarizing, and routing newly ingested evidence.",
    userVisible: false,
    allowedDataClasses: ["public", "internal", "confidential"],
    defaultTier: "economy",
    allowedTiers: ["economy", "standard"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        tier: "economy",
        enabledNow: true
      },
      {
        provider: "experimental_gateway",
        model: "deepseek-v4-flash or qwen-flash equivalent via gateway",
        tier: "economy",
        enabledNow: false
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.4,
    requiresApprovalBeforeUse: false,
    notes:
      "Good future target for cheap model offload because a human or stronger model can still gate the result."
  },
  {
    id: "review_queue_assist",
    mode: "think",
    purpose: "Internal review queue assistance for explaining why an item is pending approval or quarantined.",
    userVisible: false,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "standard",
    allowedTiers: ["standard", "restricted_safe"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "restricted_safe",
        enabledNow: true
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.55,
    requiresApprovalBeforeUse: false,
    notes:
      "Used for operator clarity, not sponsor-facing output."
  },
  {
    id: "audit_refusal",
    mode: "run",
    purpose: "Refusal, redaction, and policy-block explanation generation.",
    userVisible: true,
    allowedDataClasses: ["public", "internal", "confidential", "restricted"],
    defaultTier: "restricted_safe",
    allowedTiers: ["restricted_safe", "standard"],
    fallbackChain: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        tier: "restricted_safe",
        enabledNow: true
      }
    ],
    draftRefineFlow: "single_pass",
    confidenceFloor: 0.8,
    requiresApprovalBeforeUse: false,
    notes:
      "Policy and refusal text should come from the safest high-trust route, not the cheapest route."
  }
];

export function routePolicyFor(surfaceId: SurfaceId): RoutePolicy {
  const policy = NEXUS_MODEL_ROUTING.find((route) => route.id === surfaceId);
  if (!policy) {
    throw new Error(`Unknown Nexus model route: ${surfaceId}`);
  }
  return policy;
}

export function providerProfileFor(provider: ProviderId): ProviderProfile {
  return PROVIDER_PROFILES[provider];
}
