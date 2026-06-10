/**
 * Token budget enforcement and feature gating.
 *
 * All LLM call points (Ask, dashboard, synthesis, extraction, ingestion)
 * check the workspace token budget before calling the LLM.
 *
 * Uses a 5-minute in-process cache to avoid a DB query on every LLM call.
 * The cache is invalidated on any plan change.
 */

import type { BillingFeature, BillingPlan, PlanDefinition, TokenBudgetStatus, WorkspacePlanSummary } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

// ---------------------------------------------------------------------------
// In-process cache (5-minute TTL)
// ---------------------------------------------------------------------------

interface CacheEntry {
  status: TokenBudgetStatus;
  plan: PlanDefinition | null;
  expiresAt: number;
}

const budgetCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateBudgetCache(workspaceId: string): void {
  budgetCache.delete(workspaceId);
}

// ---------------------------------------------------------------------------
// Plan definitions (static fallback when DB unavailable)
// ---------------------------------------------------------------------------

const PLAN_FALLBACKS: Record<string, PlanDefinition> = {
  free: {
    planKey: "free", label: "Free", priceCents: 0,
    monthlyTokens: 500_000, maxRoles: 1, maxEvidence: 50, maxTeam: 1,
    maxConnectors: 0, maxApiKeys: 0, askDailyLimit: 10,
    scheduledSynthesis: false, synthesisMaxCadence: null,
    emailDelivery: false, slackDelivery: false, exportsEnabled: false,
    decisionExtraction: false, customPassports: false, dataResidency: false,
    apiAccess: false, watermark: true,
  },
  pro: {
    planKey: "pro", label: "Pro", priceCents: 49900,
    monthlyTokens: 5_000_000, maxRoles: 5, maxEvidence: 1000, maxTeam: 1,
    maxConnectors: 0, maxApiKeys: 3, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "weekly",
    emailDelivery: false, slackDelivery: false, exportsEnabled: true,
    decisionExtraction: false, customPassports: false, dataResidency: false,
    apiAccess: true, watermark: false,
  },
  business: {
    planKey: "business", label: "Business", priceCents: 250000,
    monthlyTokens: 25_000_000, maxRoles: 10, maxEvidence: 5000, maxTeam: 5,
    maxConnectors: 3, maxApiKeys: 10, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "daily",
    emailDelivery: true, slackDelivery: false, exportsEnabled: true,
    decisionExtraction: true, customPassports: true, dataResidency: false,
    apiAccess: true, watermark: false,
  },
  enterprise: {
    planKey: "enterprise", label: "Enterprise", priceCents: 0,
    monthlyTokens: 0, maxRoles: -1, maxEvidence: -1, maxTeam: -1,
    maxConnectors: -1, maxApiKeys: -1, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "daily",
    emailDelivery: true, slackDelivery: true, exportsEnabled: true,
    decisionExtraction: true, customPassports: true, dataResidency: true,
    apiAccess: true, watermark: false,
  },
};

// ---------------------------------------------------------------------------
// Core budget check
// ---------------------------------------------------------------------------

export async function checkTokenBudget(workspaceId: string): Promise<TokenBudgetStatus> {
  const cached = budgetCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.status;

  try {
    const ws = await repository.getWorkspaceBillingState(workspaceId);
    const plan = (ws?.plan ?? "free") as BillingPlan;
    const limit = ws?.monthlyTokenLimit ?? 500_000;
    const used = ws?.monthlyTokenUsed ?? 0;
    const unlimited = limit === 0;

    const status: TokenBudgetStatus = {
      allowed: unlimited || used < limit,
      used,
      limit,
      percentUsed: unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100)),
      plan,
    };

    const planDef = await repository.getPlanDefinition(plan).catch(() => null);
    budgetCache.set(workspaceId, {
      status,
      plan: planDef ?? PLAN_FALLBACKS[plan] ?? PLAN_FALLBACKS.free,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return status;
  } catch {
    // Non-fatal: if DB is down, allow the call with a permissive fallback
    return { allowed: true, used: 0, limit: 500_000, percentUsed: 0, plan: "free" };
  }
}

// ---------------------------------------------------------------------------
// Feature gating
// ---------------------------------------------------------------------------

const FEATURE_TO_PLAN_FIELD: Record<BillingFeature, keyof PlanDefinition> = {
  scheduled_synthesis: "scheduledSynthesis",
  email_delivery:      "emailDelivery",
  slack_delivery:      "slackDelivery",
  exports:             "exportsEnabled",
  decision_extraction: "decisionExtraction",
  custom_passports:    "customPassports",
  data_residency:      "dataResidency",
  api_access:          "apiAccess",
};

const FEATURE_MIN_PLAN: Record<BillingFeature, string> = {
  scheduled_synthesis: "pro",
  email_delivery:      "business",
  slack_delivery:      "enterprise",
  exports:             "pro",
  decision_extraction: "business",
  custom_passports:    "business",
  data_residency:      "enterprise",
  api_access:          "pro",
};

export async function canUseFeature(
  workspaceId: string,
  feature: BillingFeature
): Promise<{ allowed: boolean; requiredPlan: string }> {
  try {
    const cached = budgetCache.get(workspaceId);
    let planDef: PlanDefinition | null = cached?.plan ?? null;

    if (!planDef) {
      const ws = await repository.getWorkspaceBillingState(workspaceId);
      const planKey = (ws?.plan ?? "free") as BillingPlan;
      planDef = await repository.getPlanDefinition(planKey).catch(() => null)
        ?? PLAN_FALLBACKS[planKey] ?? PLAN_FALLBACKS.free;
    }

    const field = FEATURE_TO_PLAN_FIELD[feature];
    const allowed = Boolean(planDef[field]);
    return { allowed, requiredPlan: FEATURE_MIN_PLAN[feature] };
  } catch {
    return { allowed: true, requiredPlan: FEATURE_MIN_PLAN[feature] };
  }
}

// ---------------------------------------------------------------------------
// Limit enforcement helpers
// ---------------------------------------------------------------------------

export type LimitCheckResult = { allowed: boolean; used: number; limit: number; requiredPlan?: string };

export async function checkEvidenceLimit(workspaceId: string): Promise<LimitCheckResult> {
  try {
    const [ws, evidence] = await Promise.all([
      repository.getWorkspaceBillingState(workspaceId),
      repository.getEvidenceForWorkspace(workspaceId),
    ]);
    const planKey = (ws?.plan ?? "free") as BillingPlan;
    const planDef = PLAN_FALLBACKS[planKey] ?? PLAN_FALLBACKS.free;
    const limit = planDef.maxEvidence;
    const used = evidence.length;
    if (limit === -1) return { allowed: true, used, limit };
    return { allowed: used < limit, used, limit, requiredPlan: used >= limit ? "pro" : undefined };
  } catch {
    return { allowed: true, used: 0, limit: -1 };
  }
}

// ---------------------------------------------------------------------------
// Full plan summary (for Settings UI and API)
// ---------------------------------------------------------------------------

export async function getWorkspacePlanSummary(workspaceId: string): Promise<WorkspacePlanSummary> {
  const ws = await repository.getWorkspaceBillingState(workspaceId);
  const planKey = ((ws?.plan ?? "free") as BillingPlan);
  const planDef = await repository.getPlanDefinition(planKey).catch(() => null)
    ?? PLAN_FALLBACKS[planKey] ?? PLAN_FALLBACKS.free;

  const limit = ws?.monthlyTokenLimit ?? 500_000;
  const used = ws?.monthlyTokenUsed ?? 0;
  const unlimited = limit === 0;

  const [evidence, apiKeys] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.listAgentKeys(workspaceId).catch(() => []),
  ]);

  return {
    plan: planKey,
    planLabel: planDef.label,
    priceCents: planDef.priceCents,
    tokenBudget: {
      used,
      limit,
      percentUsed: unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100)),
      resetAt: ws?.tokenResetAt ?? new Date().toISOString(),
    },
    limits: {
      roles:   { used: 0, limit: planDef.maxRoles },       // active role count TBD
      evidence: { used: evidence.length, limit: planDef.maxEvidence },
      team:    { used: 1, limit: planDef.maxTeam },         // team count TBD
      apiKeys: { used: apiKeys.length, limit: planDef.maxApiKeys },
      askDailyLimit: planDef.askDailyLimit,
    },
    features: {
      scheduledSynthesis: planDef.scheduledSynthesis,
      emailDelivery:      planDef.emailDelivery,
      slackDelivery:      planDef.slackDelivery,
      exports:            planDef.exportsEnabled,
      decisionExtraction: planDef.decisionExtraction,
      customPassports:    planDef.customPassports,
      dataResidency:      planDef.dataResidency,
      apiAccess:          planDef.apiAccess,
    },
  };
}
