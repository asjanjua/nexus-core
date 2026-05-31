import type {
  ActionRight,
  AgentControlProfile,
  EvidenceRecord,
  Sensitivity
} from "@/lib/contracts";

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
};

const ACTION_RANK: Record<ActionRight, number> = {
  retrieve: 0,
  summarize: 1,
  draft: 2,
  recommend: 3,
  prepare_for_approval: 4
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function evidenceScopesForRecord(record: EvidenceRecord): string[] {
  const raw = [
    record.sourceType,
    record.department ?? "",
    record.sourcePath,
    record.sourceUri ?? ""
  ];
  const scopes = new Set<string>();
  for (const value of raw) {
    if (!value) continue;
    scopes.add(normalize(value));
    for (const part of value.split(/[^a-zA-Z0-9]+/)) {
      if (part.length >= 3) scopes.add(normalize(part));
    }
  }
  return Array.from(scopes).filter(Boolean);
}

function scopeMatches(scope: string, candidate: string): boolean {
  const a = normalize(scope);
  const b = normalize(candidate);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function anyScopeMatch(scopes: string[], candidates: string[]): boolean {
  return scopes.some((scope) => candidates.some((candidate) => scopeMatches(scope, candidate)));
}

export function canReadEvidence(
  record: EvidenceRecord,
  passport: AgentControlProfile
): PolicyDecision {
  if (passport.status !== "active") {
    return { allowed: false, reason: "agent_not_active" };
  }

  if (!record.sensitivity) {
    return { allowed: false, reason: "missing_sensitivity_treated_as_restricted" };
  }

  if (SENSITIVITY_RANK[record.sensitivity] > SENSITIVITY_RANK[passport.maxSensitivity]) {
    return { allowed: false, reason: "sensitivity_exceeds_passport_ceiling" };
  }

  const recordScopes = evidenceScopesForRecord(record);

  if (anyScopeMatch(recordScopes, passport.forbiddenScopes)) {
    return { allowed: false, reason: "forbidden_scope" };
  }

  if (!anyScopeMatch(recordScopes, passport.allowedScopes)) {
    return { allowed: false, reason: "scope_not_allowed" };
  }

  return { allowed: true };
}

export function filterEvidenceByPassport(
  records: EvidenceRecord[],
  passport: AgentControlProfile
): { allowed: EvidenceRecord[]; denied: Array<{ record: EvidenceRecord; reason: string }> } {
  const allowed: EvidenceRecord[] = [];
  const denied: Array<{ record: EvidenceRecord; reason: string }> = [];

  for (const record of records) {
    const decision = canReadEvidence(record, passport);
    if (decision.allowed) allowed.push(record);
    else denied.push({ record, reason: decision.reason });
  }

  return { allowed, denied };
}

export function canUseTool(
  tool: string,
  passport: AgentControlProfile,
  action: ActionRight
): PolicyDecision {
  if (passport.status !== "active") {
    return { allowed: false, reason: "agent_not_active" };
  }

  if (passport.forbiddenTools.some((forbidden) => scopeMatches(tool, forbidden))) {
    return { allowed: false, reason: "forbidden_tool" };
  }

  if (passport.hardStops.some((hardStop) => scopeMatches(tool, hardStop) || scopeMatches(action, hardStop))) {
    return { allowed: false, reason: "hard_stop" };
  }

  if (!passport.allowedTools.some((allowed) => scopeMatches(tool, allowed))) {
    return { allowed: false, reason: "tool_not_allowed" };
  }

  if (ACTION_RANK[action] > ACTION_RANK[passport.actionRight]) {
    return { allowed: false, reason: "action_right_exceeded" };
  }

  return { allowed: true };
}

