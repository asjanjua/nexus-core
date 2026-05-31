import type { CompanyArchetype, WorkspaceRoleState } from "@/lib/contracts";
import { labelForRole, ROLE_REGISTRY, type RoleRegistryEntry } from "@/lib/domain/role-registry";

export type RoleSuggestionProfile = {
  sector?: string | null;
  companyArchetype?: CompanyArchetype | null;
  businessModel?: string | null;
  companyStage?: string | null;
  employeeBand?: string | null;
  region?: string | null;
  primaryGoals?: string[] | null;
  riskProfile?: string | null;
  description?: string | null;
};

export type SuggestedRole = {
  roleKey: string;
  label: string;
  relevanceScore: number;
  reason: string;
  state: "active" | "staged" | "available";
  locked: boolean;
  dualHatCandidate: boolean;
  stagedCondition?: string;
};

const REGULATED_SECTORS = new Set(["financial_services", "healthcare"]);
const EARLY_SIZE_BANDS = new Set(["1_10", "11_50"]);
const EARLY_STAGES = new Set(["pre_revenue", "early_stage"]);
const STAGED_MIN_SCORE = 0.32;
const ACTIVE_MIN_SCORE = 0.55;

function textSignal(profile: RoleSuggestionProfile): string {
  return [
    profile.businessModel,
    profile.companyStage,
    profile.region,
    profile.riskProfile,
    profile.description,
    ...(profile.primaryGoals ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal.toLowerCase()));
}

function stageBoost(role: RoleRegistryEntry, stage?: string | null): number {
  if (!role.stageThreshold?.length || !stage) return 0;
  return role.stageThreshold.includes(stage) ? 0.1 : -0.05;
}

function sizeBoost(role: RoleRegistryEntry, size?: string | null): number {
  if (!role.sizeThreshold?.length || !size) return 0;
  return role.sizeThreshold.includes(size) ? 0.1 : -0.04;
}

function scoreRole(role: RoleRegistryEntry, profile: RoleSuggestionProfile): number {
  if (role.key === "ceo") return 1;

  const archetypeScore = profile.companyArchetype
    ? role.archetypeRelevance[profile.companyArchetype] ?? 0
    : 0;
  const sectorScore = profile.sector ? role.sectorRelevance[profile.sector] ?? 0 : 0;
  const text = textSignal(profile);
  const textBoost = includesAny(text, role.businessModelSignals) ? 0.16 : 0;
  const regulatedBoost =
    role.regulatoryTrigger && profile.sector && REGULATED_SECTORS.has(profile.sector) ? 0.22 : 0;

  const score =
    Math.max(archetypeScore, sectorScore) +
    textBoost +
    regulatedBoost +
    stageBoost(role, profile.companyStage) +
    sizeBoost(role, profile.employeeBand);

  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function roleReason(role: RoleRegistryEntry, profile: RoleSuggestionProfile, score: number): string {
  if (role.key === "ceo") return "Always included as the accountable leadership lens.";
  if (role.regulatoryTrigger && profile.sector && REGULATED_SECTORS.has(profile.sector)) {
    return `${labelForRole(role.key, profile.companyArchetype)} recommended: regulated ${profile.sector.replace(/_/g, " ")} context requires clear oversight.`;
  }
  if (profile.sector && role.sectorRelevance[profile.sector]) {
    return `${labelForRole(role.key, profile.companyArchetype)} recommended: strong fit for ${profile.sector.replace(/_/g, " ")} evidence and operating rhythms.`;
  }
  if (profile.companyArchetype && role.archetypeRelevance[profile.companyArchetype]) {
    return `${labelForRole(role.key, profile.companyArchetype)} recommended: useful for a ${profile.companyArchetype.replace(/_/g, " ")} company at this stage.`;
  }
  return score >= ACTIVE_MIN_SCORE
    ? `${labelForRole(role.key, profile.companyArchetype)} recommended from company description signals.`
    : `${labelForRole(role.key, profile.companyArchetype)} can be added when matching evidence appears.`;
}

function dualHatCandidate(roleKey: string, profile: RoleSuggestionProfile): boolean {
  if (roleKey === "ceo") return false;
  return (
    Boolean(profile.employeeBand && EARLY_SIZE_BANDS.has(profile.employeeBand)) ||
    Boolean(profile.companyStage && EARLY_STAGES.has(profile.companyStage))
  );
}

export function suggestRolesForProfile(profile: RoleSuggestionProfile): SuggestedRole[] {
  const suggestions = Object.values(ROLE_REGISTRY)
    .map((role) => {
      const relevanceScore = scoreRole(role, profile);
      const state = role.staged
        ? relevanceScore >= STAGED_MIN_SCORE
          ? "staged"
          : "available"
        : relevanceScore >= ACTIVE_MIN_SCORE
          ? "active"
          : "available";

      return {
        roleKey: role.key,
        label: labelForRole(role.key, profile.companyArchetype),
        relevanceScore,
        reason: roleReason(role, profile, relevanceScore),
        state,
        locked: role.key === "ceo",
        dualHatCandidate: dualHatCandidate(role.key, profile),
        stagedCondition: role.stagedCondition
      } satisfies SuggestedRole;
    })
    .filter((role) => role.roleKey === "ceo" || role.state !== "available" || role.relevanceScore >= 0.42)
    .sort((a, b) => {
      if (a.roleKey === "ceo") return -1;
      if (b.roleKey === "ceo") return 1;
      const stateWeight = (state: SuggestedRole["state"]) => (state === "active" ? 2 : state === "staged" ? 1 : 0);
      return stateWeight(b.state) - stateWeight(a.state) || b.relevanceScore - a.relevanceScore;
    });

  return suggestions;
}

export function roleStatesFromSuggestions(suggestions: SuggestedRole[]): Record<string, WorkspaceRoleState> {
  return Object.fromEntries(
    suggestions.map((role) => [
      role.roleKey,
      {
        state: role.state,
        activatedAt: role.state === "active" ? new Date().toISOString() : null,
        stagedCondition: role.stagedCondition ?? null,
        dualHatOf: role.dualHatCandidate && role.state === "active" ? "ceo" : null
      }
    ])
  );
}
