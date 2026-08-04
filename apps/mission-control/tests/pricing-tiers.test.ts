import { describe, expect, it } from "vitest";
import { PRICING_TIERS, perSeatUsd, tierForHeadcount } from "@/lib/pricing-tiers";

describe("pricing bands", () => {
  it("covers every company size with exactly one tier", () => {
    // The failure this guards: a band that overlaps the next shows two prices
    // for the same company, and a gap shows none. Both are visible on a public
    // page and both cost trust immediately.
    for (let seats = 1; seats <= 500; seats++) {
      const matches = PRICING_TIERS.filter(
        (t) => seats >= t.minSeats && (t.maxSeats === null || seats <= t.maxSeats)
      );
      expect(matches, `${seats} seats matched ${matches.length} tiers`).toHaveLength(1);
    }
  });

  it("has no gap between one band ending and the next beginning", () => {
    for (let i = 0; i < PRICING_TIERS.length - 1; i++) {
      const current = PRICING_TIERS[i];
      const next = PRICING_TIERS[i + 1];
      expect(current.maxSeats).not.toBeNull();
      expect(next.minSeats).toBe((current.maxSeats as number) + 1);
    }
  });

  it("puts a ten-person company on the lower price", () => {
    // The brief said "1-10" and "10-50", which both claim ten. Resolved in the
    // customer's favour; this pins that decision so it cannot drift silently.
    expect(tierForHeadcount(10).key).toBe("starter");
    expect(tierForHeadcount(11).key).toBe("growth");
  });

  it("places the documented boundaries correctly", () => {
    expect(tierForHeadcount(1).monthlyUsd).toBe(49);
    expect(tierForHeadcount(50).monthlyUsd).toBe(499);
    expect(tierForHeadcount(51).monthlyUsd).toBe(1199);
    expect(tierForHeadcount(5000).key).toBe("enterprise");
  });

  it("shows a price rather than failing on nonsense input", () => {
    for (const value of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => tierForHeadcount(value)).not.toThrow();
    }
    expect(tierForHeadcount(0).key).toBe("starter");
    expect(tierForHeadcount(-3).key).toBe("starter");
  });

  it("rounds a fractional headcount up to a whole person", () => {
    // 10.5 people is 11 people for billing. Rounding down would put a company
    // on a cheaper band than it belongs to.
    expect(tierForHeadcount(10.5).key).toBe("growth");
  });

  it("only quotes on enterprise, and labels it as a starting price", () => {
    const quoted = PRICING_TIERS.filter((t) => t.quoteRequired);
    expect(quoted.map((t) => t.key)).toEqual(["enterprise"]);
    expect(quoted[0].priceLabel).toMatch(/from/i);
    expect(perSeatUsd(quoted[0], 100)).toBeNull();
  });

  it("maps every tier onto a real billing plan key", () => {
    // Drift here means a checkout that cannot resolve a Stripe price.
    const valid = new Set(["free", "pro", "business", "enterprise"]);
    for (const tier of PRICING_TIERS) expect(valid.has(tier.planKey)).toBe(true);
    expect(new Set(PRICING_TIERS.map((t) => t.planKey)).size).toBe(PRICING_TIERS.length);
  });

  it("computes per-seat cost, which exposes the step at the boundary", () => {
    // Documented rather than asserted as good: at ten people the starter band
    // is $4.90 a head, and at eleven the growth band is $45.36. That cliff is
    // a deliberate commercial choice and this test makes it visible.
    expect(perSeatUsd(tierForHeadcount(10), 10)).toBeCloseTo(4.9, 2);
    expect(perSeatUsd(tierForHeadcount(11), 11)).toBeCloseTo(45.36, 2);
  });
});
