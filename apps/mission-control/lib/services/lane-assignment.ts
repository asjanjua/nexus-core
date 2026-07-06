/**
 * Lane assignment rules — pure function mapping readiness context to a buyer lane.
 *
 * Bridge in the canonical strategy (docs/USER_STRATEGY_AND_PIVOTS.md):
 * readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot.
 *
 * Rules, thresholds, and the lane-change lifecycle are documented in
 * docs/LANE_ASSIGNMENT_SPEC.md. Tune them there first, then here.
 *
 * The lane set by this function is the INITIAL lane. Lane changes after claim
 * are governed reclassifications: rare, explainable, human-confirmed, audited.
 */

import type { BuyerLane, LaneConfidence } from "@/lib/contracts";

/** Sectors treated as regulated regardless of company size. */
export const REGULATED_SECTORS = new Set([
  "financial_services",
  "healthcare",
  "government_public",
]);

/** Roles that indicate an advisory/transformation buyer. */
export const ADVISORY_ROLES = new Set([
  "consultant",
  "advisor",
  "transformation_lead",
]);

export type LaneAssignmentInput = {
  sector?: string | null;
  companySize?: string | null; // "1-20" | "21-50" | "51-200" | "200+"
  role?: string | null;        // "founder_owner" | "executive" | "consultant" | "advisor" | "transformation_lead" | "manager" | "other"
  band?: string | null;        // "Emerging" | "Developing" | "AI-Native"
};

export type LaneAssignment = {
  lane: BuyerLane;
  confidence: LaneConfidence;
  reason: string;
};

export function assignLane(input: LaneAssignmentInput): LaneAssignment {
  const sector = input.sector?.trim() || null;
  const size = input.companySize?.trim() || null;
  const role = input.role?.trim() || null;
  const band = input.band?.trim() || null;

  const confidence: LaneConfidence =
    sector && size ? "high" : sector || size ? "medium" : "low";

  // Rule 1 — regulated sectors are sticky, regardless of size or band.
  if (sector && REGULATED_SECTORS.has(sector)) {
    return {
      lane: "regulated_enterprise",
      confidence,
      reason: `Regulated sector (${sector}); governance-first lane applies at any size.`,
    };
  }

  // Rule 2 — advisory roles or larger organisations route to business/advisory.
  if (role && ADVISORY_ROLES.has(role)) {
    return {
      lane: "business_advisory",
      confidence,
      reason: `Advisory role (${role}); pilot-scoping lane.`,
    };
  }
  if (size === "51-200" || size === "200+") {
    return {
      lane: "business_advisory",
      confidence,
      reason: `Company size ${size}; sponsor-led pilot lane.`,
    };
  }

  // Rule 3 — small organisations with implementation intent self-serve.
  if ((size === "1-20" || size === "21-50") && band && band !== "Emerging") {
    return {
      lane: "sme_self_serve",
      confidence,
      reason: `Small organisation with ${band} readiness band; self-serve lane.`,
    };
  }

  // Default — evaluator lane until more signal exists.
  return {
    lane: "evaluator",
    confidence,
    reason: band
      ? `Insufficient signal beyond band ${band}; default evaluator lane.`
      : "No profile signal; default evaluator lane.",
  };
}
