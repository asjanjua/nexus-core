import { describe, expect, it } from "vitest";
import { askResponseSchema, retrievalMethodSchema } from "../lib/contracts";

/**
 * Retrieval provenance contract.
 *
 * The product's claim is that a reader can see how an answer was reached.
 * Two things must therefore stay true, and neither is obvious enough to
 * survive a refactor unguarded:
 *
 *  1. "none" is a real, distinct value. When the access passport denies every
 *     record, or there are no candidates, NO tier ran. Reporting that as
 *     "keyword" would be a false provenance claim in the one surface that
 *     sells honesty.
 *
 *  2. Older payloads without these fields must still parse. The fields are
 *     defaulted, not required, so persisted conversation history written
 *     before this change does not blow up on read.
 */

const BASE = {
  answer: "Tier-2 onboarding exceeds appetite.",
  confidence: 0.82,
  freshnessHours: 12,
  refused: false,
  evidenceRefs: ["ev_1", "ev_2"],
};

describe("retrievalMethod", () => {
  it("includes none as a distinct value, not just the three tiers", () => {
    expect(retrievalMethodSchema.options).toEqual(["graph", "vector", "keyword", "none"]);
  });

  it("rejects an unknown method rather than coercing it", () => {
    expect(retrievalMethodSchema.safeParse("magic").success).toBe(false);
  });
});

describe("askResponseSchema", () => {
  it("defaults to none for payloads written before provenance existed", () => {
    const parsed = askResponseSchema.parse({ ...BASE });
    expect(parsed.retrievalMethod).toBe("none");
    expect(parsed.matchedEntities).toEqual([]);
  });

  it("carries a graph traversal and the entities that drove it", () => {
    const parsed = askResponseSchema.parse({
      ...BASE,
      retrievalMethod: "graph",
      matchedEntities: [{ id: "e1", name: "Qasr Pay", type: "company", confidence: 0.9 }],
    });
    expect(parsed.retrievalMethod).toBe("graph");
    expect(parsed.matchedEntities[0].name).toBe("Qasr Pay");
  });

  it("allows a refusal to report that no retrieval ran", () => {
    // A passport-denied answer has no tier. It must be able to say so.
    const parsed = askResponseSchema.parse({
      ...BASE,
      answer: "Relevant evidence exists but this agent may not access it.",
      refused: true,
      refusalReason: "passport_denied_evidence",
      evidenceRefs: [],
      retrievalMethod: "none",
    });
    expect(parsed.refused).toBe(true);
    expect(parsed.retrievalMethod).toBe("none");
  });

  it("rejects a malformed matched entity rather than dropping it silently", () => {
    const bad = askResponseSchema.safeParse({
      ...BASE,
      matchedEntities: [{ id: "e1", name: "Qasr Pay" }],
    });
    expect(bad.success).toBe(false);
  });
});
