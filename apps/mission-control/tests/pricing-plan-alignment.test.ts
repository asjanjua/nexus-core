import { describe, expect, it } from "vitest";
import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { PLAN_FALLBACKS } from "@/lib/billing/budget";

/**
 * The published price and the charged price must be the same number.
 *
 * This suite exists because they were not. /pricing advertised Starter at $49
 * for up to ten people, while the plan it maps to charged $499 and capped the
 * workspace at a single seat. A buyer would have read one number, paid ten
 * times it, and then been unable to invite the team they had just paid for.
 *
 * Nothing here is clever. It is a diff between two files that must agree.
 */
describe("published pricing matches plan definitions", () => {
  it.each(PRICING_TIERS.map((t) => [t.label, t] as const))(
    "%s charges what the page says",
    (_label, tier) => {
      const plan = PLAN_FALLBACKS[tier.planKey];
      expect(plan, `no plan definition for ${tier.planKey}`).toBeDefined();

      if (tier.quoteRequired) {
        // Enterprise is quoted, so the fallback carries no price and settings
        // renders "Custom pricing". A number here would be a promise the sales
        // conversation has not made yet.
        expect(plan.priceCents).toBe(0);
      } else {
        expect(plan.priceCents).toBe(tier.monthlyUsd * 100);
      }
    }
  );

  it.each(PRICING_TIERS.map((t) => [t.label, t] as const))(
    "%s allows the seats the page sells",
    (_label, tier) => {
      const plan = PLAN_FALLBACKS[tier.planKey];
      if (tier.maxSeats === null) {
        // Open-ended band, so the plan must not cap the workspace at all.
        expect(plan.maxTeam).toBe(-1);
      } else {
        // Selling "up to 50 people" and enforcing fewer is the version of this
        // bug that survives a price fix, so it is asserted separately.
        expect(plan.maxTeam).toBe(tier.maxSeats);
      }
    }
  );

  it("labels the plan the same way the page does", () => {
    // A buyer who chooses "Growth" and lands on a checkout headed "Business"
    // has reason to think they clicked the wrong thing.
    for (const tier of PRICING_TIERS) {
      expect(PLAN_FALLBACKS[tier.planKey].label).toBe(tier.label);
    }
  });

  it("leaves the free plan out of the published tiers", () => {
    // Free exists in the product but is not sold, so it must not appear on the
    // pricing page by accident through a shared key.
    expect(PRICING_TIERS.some((t) => t.planKey === "free")).toBe(false);
    expect(PLAN_FALLBACKS.free.priceCents).toBe(0);
  });

  it("prices each paid band above the one below it", () => {
    const paid = PRICING_TIERS.filter((t) => !t.quoteRequired);
    for (let i = 1; i < paid.length; i++) {
      expect(paid[i].monthlyUsd).toBeGreaterThan(paid[i - 1].monthlyUsd);
    }
  });
});
