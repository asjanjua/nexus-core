/**
 * Agent Control Profile — prompt-boundary enforcement.
 *
 * Before any evidence record enters an LLM prompt, it must pass
 * the active Agent Control Profile's sensitivity ceiling, scope
 * restrictions, and action-right gates. This is the security layer
 * that guards against regulated evidence leaking into prompts.
 *
 * Used by: Ask retrieval, executive synthesis, approval review,
 * workflow twin runs, and any other LLM-backed evidence pipeline.
 */

import type { AgentControlProfile, Sensitivity } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceRecord {
  id: string;
  sensitivity: Sensitivity;
  /** Free-form scope tags (department, project, client). */
  scopes?: string[];
}

export interface ProfileEnforcementResult {
  allowed: EvidenceRecord[];
  blocked: BlockedRecord[];
}

export interface BlockedRecord {
  id: string;
  reason: BlockReason;
  detail: string;
}

export type BlockReason =
  | "sensitivity_exceeds_max"
  | "scope_forbidden"
  | "scope_not_allowed"
  | "action_right_insufficient"
  | "profile_suspended"
  | "profile_not_active";

// ---------------------------------------------------------------------------
// Sensitivity ranking — order matters for ceiling checks.
// ---------------------------------------------------------------------------

const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

export function enforceAgentControlProfile(
  evidence: EvidenceRecord[],
  profile: AgentControlProfile,
  requestedAction: "retrieve" | "summarize" | "draft" | "recommend" | "prepare_for_approval",
): ProfileEnforcementResult {
  const allowed: EvidenceRecord[] = [];
  const blocked: BlockedRecord[] = [];

  // Gate 0: profile status
  if (profile.status === "suspended") {
    for (const e of evidence) {
      blocked.push({
        id: e.id,
        reason: "profile_suspended",
        detail: `Agent control profile "${profile.agentKey}" is suspended. No evidence can enter prompts.`,
      });
    }
    return { allowed, blocked };
  }

  if (profile.status !== "active") {
    for (const e of evidence) {
      blocked.push({
        id: e.id,
        reason: "profile_not_active",
        detail: `Agent control profile "${profile.agentKey}" is ${profile.status}, not active.`,
      });
    }
    return { allowed, blocked };
  }

  // Gate 1: action right — the profile must authorize this operation.
  const actionRank: Record<string, number> = {
    retrieve: 0,
    summarize: 1,
    draft: 2,
    recommend: 3,
    prepare_for_approval: 4,
  };
  const profileRank = actionRank[profile.actionRight] ?? 0;
  const requiredRank = actionRank[requestedAction] ?? 0;
  if (profileRank < requiredRank) {
    for (const e of evidence) {
      blocked.push({
        id: e.id,
        reason: "action_right_insufficient",
        detail: `Profile action right is "${profile.actionRight}" but "${requestedAction}" requires at least that level.`,
      });
    }
    return { allowed, blocked };
  }

  // Gate 2: per-evidence checks — sensitivity ceiling + scope.
  const profileMaxRank = SENSITIVITY_RANK[profile.maxSensitivity] ?? 1;
  const forbidden = new Set(profile.forbiddenScopes);
  const allowedSet = new Set(profile.allowedScopes);

  for (const e of evidence) {
    // Sensitivity ceiling
    const evidenceRank = SENSITIVITY_RANK[e.sensitivity] ?? 0;
    if (evidenceRank > profileMaxRank) {
      blocked.push({
        id: e.id,
        reason: "sensitivity_exceeds_max",
        detail: `Evidence sensitivity is "${e.sensitivity}" but profile max is "${profile.maxSensitivity}".`,
      });
      continue;
    }

    // Scope restrictions — if allowedScopes is non-empty, evidence must be in it.
    const scopes = e.scopes ?? [];
    if (allowedSet.size > 0 && scopes.length > 0) {
      const hasAllowedScope = scopes.some((s) => allowedSet.has(s));
      if (!hasAllowedScope) {
        blocked.push({
          id: e.id,
          reason: "scope_not_allowed",
          detail: `Evidence scopes [${scopes.join(", ")}] are not in profile's allowed scopes.`,
        });
        continue;
      }
    }

    // Forbidden scopes — evidence with any forbidden scope is blocked.
    if (forbidden.size > 0 && scopes.length > 0) {
      const hasForbiddenScope = scopes.some((s) => forbidden.has(s));
      if (hasForbiddenScope) {
        blocked.push({
          id: e.id,
          reason: "scope_forbidden",
          detail: `Evidence scopes [${scopes.join(", ")}] include a forbidden scope.`,
        });
        continue;
      }
    }

    allowed.push(e);
  }

  return { allowed, blocked };
}
