/**
 * Plan catalogue: static plan definitions, used when the database is
 * unavailable or carries no row for a plan.
 *
 * DEPENDENCY-FREE ON PURPOSE. These lived in budget.ts, which imports the
 * repository and Sentry. When stripe.ts began deriving its token limits from
 * them, it inherited that entire runtime graph to read four numbers, and any
 * test that mocked budget.ts broke stripe.ts at module load.
 *
 * Constants belong somewhere nothing has to be mocked to reach.
 *
 * priceCents and maxTeam MUST agree with PRICING_TIERS in lib/pricing-tiers.ts,
 * which is what /pricing publishes. tests/pricing-plan-alignment.test.ts fails
 * the build if they drift. They already had, badly: the page advertised $49
 * for up to 10 people while this charged $499 and capped the workspace at one
 * seat.
 */

import type { PlanDefinition } from "@/lib/contracts";

export const PLAN_FALLBACKS: Record<string, PlanDefinition> = {
  free: {
    planKey: "free", label: "Free", priceCents: 0,
    monthlyTokens: 500_000, maxRoles: 1, maxEvidence: 50, maxTeam: 1,
    maxConnectors: 0, maxApiKeys: 0, askDailyLimit: 10,
    scheduledSynthesis: false, synthesisMaxCadence: null,
    emailDelivery: false, slackDelivery: false, exportsEnabled: false,
    decisionExtraction: false, customPassports: false, dataResidency: false,
    apiAccess: false, watermark: true, stripePriceId: null,
  },
  pro: {
    planKey: "pro", label: "Starter", priceCents: 4_900,
    monthlyTokens: 5_000_000, maxRoles: 5, maxEvidence: 1000, maxTeam: 10,
    maxConnectors: 0, maxApiKeys: 3, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "weekly",
    emailDelivery: false, slackDelivery: false, exportsEnabled: true,
    decisionExtraction: false, customPassports: false, dataResidency: false,
    apiAccess: true, watermark: false, stripePriceId: null,
  },
  business: {
    planKey: "business", label: "Growth", priceCents: 49_900,
    monthlyTokens: 25_000_000, maxRoles: 10, maxEvidence: 5000, maxTeam: 50,
    maxConnectors: 3, maxApiKeys: 10, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "daily",
    emailDelivery: true, slackDelivery: false, exportsEnabled: true,
    decisionExtraction: true, customPassports: true, dataResidency: false,
    apiAccess: true, watermark: false, stripePriceId: null,
  },
  enterprise: {
    planKey: "enterprise", label: "Enterprise", priceCents: 0,
    monthlyTokens: 0, maxRoles: -1, maxEvidence: -1, maxTeam: -1,
    maxConnectors: -1, maxApiKeys: -1, askDailyLimit: null,
    scheduledSynthesis: true, synthesisMaxCadence: "daily",
    emailDelivery: true, slackDelivery: true, exportsEnabled: true,
    decisionExtraction: true, customPassports: true, dataResidency: true,
    apiAccess: true, watermark: false, stripePriceId: null,
  },
};
