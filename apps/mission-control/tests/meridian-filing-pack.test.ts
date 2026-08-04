import { describe, expect, it } from "vitest";
import {
  buildFilingPackItems,
  countBlockers,
  type FilingPackInput,
} from "@/lib/meridian-filing-pack";

/** A pack with nothing wrong with it. Each test spoils exactly one thing. */
const CLEAN: FilingPackInput = {
  regulator: "State Bank of Pakistan",
  licenseType: "Electronic Money Institution (EMI)",
  reviewerName: "A. Khan",
  packSource: "dedicated",
  totals: {
    total: 22,
    covered: 22,
    criticalGaps: 0,
    restrictedExcluded: 0,
    untypedDocuments: 0,
    inferredDocuments: 0,
  },
};

const rowFor = (input: FilingPackInput, label: string) =>
  buildFilingPackItems(input).find((i) => i.label === label)!;

describe("buildFilingPackItems", () => {
  it("returns the same five rows whatever the state", () => {
    // The rows are a checklist. One vanishing because it happens to be fine
    // would quietly shrink what the reviewer is being asked to confirm.
    const labels = buildFilingPackItems(CLEAN).map((i) => i.label);
    expect(labels).toEqual([
      "Requirement matrix",
      "Evidence index",
      "Caveat register",
      "Qualified reviewer",
      "Submission memo",
    ]);
    expect(buildFilingPackItems({ ...CLEAN, reviewerName: null, packSource: "generic" })).toHaveLength(5);
  });

  it("blocks nothing when the pack is genuinely clean", () => {
    // Only the memo stays a draft, and the caveat register invites entry.
    expect(countBlockers(buildFilingPackItems(CLEAN))).toBe(0);
  });

  it("never marks the submission memo ready", () => {
    // Whether a narrative is adequate is a judgement. A green tick here would
    // be the product asserting something it cannot know.
    for (const input of [CLEAN, { ...CLEAN, reviewerName: null }]) {
      const memo = rowFor(input, "Submission memo");
      expect(memo.state).toBe("Draft");
      expect(memo.tone).toBe("draft");
    }
  });

  it("blocks the requirement matrix when the pack is only a generic baseline", () => {
    const row = rowFor({ ...CLEAN, packSource: "generic" }, "Requirement matrix");
    expect(row.tone).toBe("blocked");
    expect(row.detail).toMatch(/not the regulator's list/i);
  });

  it("blocks the handoff when no reviewer is named", () => {
    const row = rowFor({ ...CLEAN, reviewerName: null }, "Qualified reviewer");
    expect(row.tone).toBe("blocked");
    expect(countBlockers(buildFilingPackItems({ ...CLEAN, reviewerName: null }))).toBe(1);
  });

  it("blocks the caveat register on a critical gap and counts it", () => {
    const input = { ...CLEAN, totals: { ...CLEAN.totals, criticalGaps: 3, covered: 19 } };
    const row = rowFor(input, "Caveat register");
    expect(row.tone).toBe("blocked");
    expect(row.detail).toContain("3 critical requirements have");
  });

  it("uses singular wording for a single critical gap", () => {
    const input = { ...CLEAN, totals: { ...CLEAN.totals, criticalGaps: 1, covered: 21 } };
    expect(rowFor(input, "Caveat register").detail).toContain("1 critical requirement has");
  });

  it("does not call the caveat register ready when there are no critical gaps", () => {
    // Absence of critical gaps is not a clean bill of health; the register is
    // where a human writes down what they know that the data does not show.
    const row = rowFor(CLEAN, "Caveat register");
    expect(row.tone).toBe("review");
    expect(row.state).toBe("Open for entry");
  });

  it("blocks the evidence index when nothing is covered", () => {
    const input = { ...CLEAN, totals: { ...CLEAN.totals, covered: 0, criticalGaps: 5 } };
    const row = rowFor(input, "Evidence index");
    expect(row.tone).toBe("blocked");
    expect(row.state).toBe("Empty");
  });

  it("downgrades the evidence index to caveated rather than ready", () => {
    const input = {
      ...CLEAN,
      totals: { ...CLEAN.totals, untypedDocuments: 4, inferredDocuments: 2, restrictedExcluded: 1 },
    };
    const row = rowFor(input, "Evidence index");
    expect(row.tone).toBe("review");
    expect(row.state).toBe("Ready with caveats");
    // All three weakening signals must be named, not silently absorbed.
    expect(row.detail).toContain("4 documents could not be identified");
    expect(row.detail).toContain("2 identified from contents");
    expect(row.detail).toContain("1 excluded by access scope");
  });

  it("counts every independent blocker at once", () => {
    const worst: FilingPackInput = {
      ...CLEAN,
      reviewerName: null,
      packSource: "generic",
      totals: { ...CLEAN.totals, covered: 0, criticalGaps: 9 },
    };
    // Matrix, evidence index, caveat register, reviewer.
    expect(countBlockers(buildFilingPackItems(worst))).toBe(4);
  });
});
