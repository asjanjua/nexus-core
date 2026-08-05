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
import { captureHandledError } from "@/lib/observability/sentry";

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
//
// Moved to plan-catalog.ts so modules needing only the constants do not pull
// in this file's repository and Sentry imports. Re-exported here because
// existing callers import it from budget.
// ---------------------------------------------------------------------------

export { PLAN_FALLBACKS } from "@/lib/billing/plan-catalog";
import { PLAN_FALLBACKS } from "@/lib/billing/plan-catalog";
import { nextTierUp } from "@/lib/pricing-tiers";

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
  } catch (error) {
    // Non-fatal: if DB is down, allow the call with a permissive fallback.
    // Reported because a sustained failure here means budgets are not being
    // enforced at all, which is invisible from the outside.
    captureHandledError(error, {
      route: "lib/billing/budget.checkTokenBudget",
      errorType: "budget_check_failed_open",
      workspaceId,
    });
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
  } catch (error) {
    captureHandledError(error, {
      route: "lib/billing/budget.canUseFeature",
      errorType: "feature_gate_failed_open",
      workspaceId,
      extra: { feature },
    });
    return { allowed: true, requiredPlan: FEATURE_MIN_PLAN[feature] };
  }
}

// ---------------------------------------------------------------------------
// Limit enforcement helpers
// ---------------------------------------------------------------------------

export type LimitCheckResult = { allowed: boolean; used: number; limit: number; requiredPlan?: string };

/**
 * Enforced at the single ingestion chokepoint, `ingestEvidence`, which every
 * connector, upload, demo seed and Slack adapter routes through.
 *
 * FAILS OPEN, deliberately. If the billing lookup throws, work is allowed
 * through rather than blocked. A billing outage that silently halts a paying
 * customer's pilot is a far worse failure than a workspace briefly exceeding a
 * ceiling we can reconcile later.
 */
export async function checkEvidenceLimit(workspaceId: string): Promise<LimitCheckResult> {
  try {
    // Consults the DB plan definition first, matching the other three plan
    // lookups in this file. Reading only PLAN_FALLBACKS meant a workspace on a
    // negotiated Enterprise ceiling would be measured against the hardcoded
    // default instead of the contract.
    const [ws, evidence] = await Promise.all([
      repository.getWorkspaceBillingState(workspaceId),
      repository.getEvidenceForWorkspace(workspaceId),
    ]);
    const planKey = (ws?.plan ?? "free") as BillingPlan;
    const planDef =
      (await repository.getPlanDefinition(planKey).catch(() => null)) ??
      PLAN_FALLBACKS[planKey] ??
      PLAN_FALLBACKS.free;
    const limit = planDef.maxEvidence;
    const used = evidence.length;
    if (limit === -1) return { allowed: true, used, limit };
    // The upgrade prompt must name a plan the customer is not already on.
    // This said "pro" unconditionally, so a Starter customer at their ceiling
    // was told to upgrade to Starter.
    const upgrade = used >= limit ? nextTierUp(planKey) : null;
    return {
      allowed: used < limit,
      used,
      limit,
      requiredPlan: upgrade?.label,
    };
  } catch (error) {
    captureHandledError(error, {
      route: "lib/billing/budget.checkEvidenceLimit",
      errorType: "evidence_limit_failed_open",
      workspaceId,
    });
    return { allowed: true, used: 0, limit: -1 };
  }
}

/**
 * Check whether adding another team member would exceed the workspace's
 * `maxTeam` plan limit.
 *
 * Called by the Clerk `organizationMembership.created` webhook. Like
 * `checkEvidenceLimit`, it FAILS OPEN: if the billing lookup throws, the
 * member is allowed through. A transient DB error that blocks a legitimate
 * team member from joining is worse than a workspace briefly exceeding a
 * ceiling we can detect and reconcile.
 *
 * Enterprise plans (maxTeam === -1) always pass.
 */
export async function checkTeamSeatLimit(workspaceId: string): Promise<LimitCheckResult> {
  try {
    const [ws, seats] = await Promise.all([
      repository.getWorkspaceBillingState(workspaceId),
      repository.countWorkspaceSeats(workspaceId),
    ]);
    const planKey = (ws?.plan ?? "free") as BillingPlan;
    const planDef =
      (await repository.getPlanDefinition(planKey).catch(() => null)) ??
      PLAN_FALLBACKS[planKey] ??
      PLAN_FALLBACKS.free;
    const limit = planDef.maxTeam;
    const used = seats.members;
    // -1 = unlimited (Enterprise). Already at or over limit = blocked.
    if (limit === -1) return { allowed: true, used, limit };
    const upgrade = used >= limit ? nextTierUp(planKey) : null;
    return {
      allowed: used < limit,
      used,
      limit,
      requiredPlan: upgrade?.label,
    };
  } catch (error) {
    captureHandledError(error, {
      route: "lib/billing/budget.checkTeamSeatLimit",
      errorType: "team_limit_failed_open",
      workspaceId,
    });
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

  const [evidence, apiKeys, seats] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.listAgentKeys(workspaceId).catch(() => []),
    repository.countWorkspaceSeats(workspaceId).catch(() => ({ members: 0, roles: 0 })),
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
      // Real counts. These were hardcoded 0 and 1 with a "TBD" comment, which
      // meant the seat figure the pricing page sells against ("1 to 10
      // people") bore no relation to the workspace. Counting them is also the
      // prerequisite for enforcing them, which is still a product decision:
      // nothing currently stops a Starter workspace adding fifty people.
      roles:   { used: seats.roles, limit: planDef.maxRoles },
      evidence: { used: evidence.length, limit: planDef.maxEvidence },
      team:    { used: seats.members, limit: planDef.maxTeam },
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
