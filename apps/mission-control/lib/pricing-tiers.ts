/**
 * Published pricing, as one source of truth.
 *
 * Pure and testable, because the thing that goes wrong with banded pricing is
 * not the numbers, it is the boundaries: a band that overlaps the next one
 * shows two prices for the same company, and a gap shows none. Those are the
 * assertions in tests/pricing-tiers.test.ts.
 *
 * BANDS ARE STATED AS 1-10 / 11-50 / 51+, deliberately. The brief said
 * "1-10" and "10-50", which both claim a ten-person company. A pricing page
 * cannot be ambiguous about who pays what, so the boundary is resolved in
 * favour of the customer: at exactly ten people you are on the lower price.
 *
 * The 51+ figure is a STARTING price, not the price. Enterprise is quoted
 * after a conversation, so the page must not imply 2,500 is the whole answer.
 */

export type PricingTier = {
  key: "starter" | "growth" | "enterprise";
  /** Maps to the existing BillingPlan enum in contracts.ts. */
  planKey: "pro" | "business" | "enterprise";
  label: string;
  minSeats: number;
  /** Null means open-ended. */
  maxSeats: number | null;
  /** USD per month. For enterprise this is a floor, not a quote. */
  monthlyUsd: number;
  /** True when the price shown is a starting point requiring a conversation. */
  quoteRequired: boolean;
  seatRangeLabel: string;
  priceLabel: string;
  /** What the buyer is actually saying yes to at this level. */
  positioning: string;
  cta: { label: string; href: string };
};

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "starter",
    planKey: "pro",
    label: "Starter",
    minSeats: 1,
    maxSeats: 10,
    monthlyUsd: 49,
    quoteRequired: false,
    seatRangeLabel: "1 to 10 people",
    priceLabel: "$49",
    positioning:
      "One team putting its evidence in one place, with the governance record switched on from day one.",
    cta: { label: "Start", href: "/start-pilot" },
  },
  {
    key: "growth",
    planKey: "business",
    label: "Growth",
    minSeats: 11,
    maxSeats: 50,
    monthlyUsd: 499,
    quoteRequired: false,
    seatRangeLabel: "11 to 50 people",
    priceLabel: "$499",
    positioning:
      "Several functions working the same evidence, where who approved what has to be answerable months later.",
    cta: { label: "Start", href: "/start-pilot" },
  },
  {
    key: "enterprise",
    planKey: "enterprise",
    label: "Enterprise",
    minSeats: 51,
    maxSeats: null,
    /**
     * Benchmarked August 2026 against the closest comparable: Vanta charges
     * $25,000 to $55,000 a year for 50 to 200 employees. $2,500 a month is
     * $30,000 a year, at the lower end of that band. The previous $1,199 floor
     * was $14,388 a year, which sat in Vanta's UNDER-fifty pricing while this
     * tier sells to the segment above it.
     */
    monthlyUsd: 2500,
    quoteRequired: true,
    seatRangeLabel: "51 people and above",
    priceLabel: "From $2,500",
    positioning:
      "Regulated deployments with their own data residency, review, and audit obligations. Scoped on a call.",
    cta: { label: "Book a call", href: "/start-pilot" },
  },
];

/**
 * The tier a company of this size falls into.
 *
 * Returns the enterprise tier for any size at or above its floor, and the
 * starter tier for nonsensical input (0, negative, fractional) rather than
 * throwing — a pricing page asked a silly question should still show a price.
 */
export function tierForHeadcount(headcount: number): PricingTier {
  if (!Number.isFinite(headcount) || headcount < 1) return PRICING_TIERS[0];
  const seats = Math.ceil(headcount);
  return (
    PRICING_TIERS.find((t) => seats >= t.minSeats && (t.maxSeats === null || seats <= t.maxSeats)) ??
    PRICING_TIERS[PRICING_TIERS.length - 1]
  );
}

/**
 * Where a tier's button should send someone who is not signed in.
 *
 * Self-serve tiers carry the choice through sign-up so it survives the detour:
 * a buyer who picked Growth on the pricing page should not have to find the
 * billing tab and pick it again. Enterprise goes to the lead form instead,
 * because there is no self-serve price to check out against.
 *
 * The intent is a QUERY PARAMETER, not a purchase. Settings surfaces a button;
 * nobody is dropped onto a payment page by a link they followed from a public
 * site, which would be an unpleasant surprise from a governance product.
 */
export function ctaHref(tier: PricingTier): string {
  if (tier.quoteRequired) return tier.cta.href;
  const destination = `/settings?checkout=${tier.planKey}`;
  return `/sign-up?redirect_url=${encodeURIComponent(destination)}`;
}

/** Plan key from a `?checkout=` value, or null if it is not a self-serve plan. */
export function checkoutIntentFromParam(value: string | null | undefined): "pro" | "business" | null {
  if (!value) return null;
  const match = PRICING_TIERS.find((t) => !t.quoteRequired && t.planKey === value.trim());
  // Narrowed by the quoteRequired filter above; enterprise can never arrive
  // here, so a crafted ?checkout=enterprise does not open a checkout.
  return (match?.planKey as "pro" | "business") ?? null;
}

/** Monthly cost per person, for comparing bands honestly. Null when quoted. */
export function perSeatUsd(tier: PricingTier, headcount: number): number | null {
  if (tier.quoteRequired) return null;
  const seats = Math.max(1, Math.ceil(headcount));
  return tier.monthlyUsd / seats;
}
