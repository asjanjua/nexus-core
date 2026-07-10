import { describe, expect, it } from "vitest";
import {
  checklistForDealType,
  coverageForDeal,
  gapsForDeal,
  IC_MEMO_TEMPLATE,
} from "@/lib/domain/dd-checklist-library";

describe("checklistForDealType", () => {
  it("returns the fintech M&A checklist with all categories", () => {
    const categories = checklistForDealType("fintech_ma");
    const keys = categories.map((c) => c.key);
    expect(keys).toEqual(
      expect.arrayContaining(["financial", "regulatory", "legal_corporate", "technology_data", "hr_people"])
    );
  });

  it("every item has a non-empty requirement, at least one evidence tag, and a red flag indicator", () => {
    const categories = checklistForDealType("fintech_ma");
    for (const category of categories) {
      for (const item of category.items) {
        expect(item.requirement.length).toBeGreaterThan(0);
        expect(item.evidenceTags.length).toBeGreaterThan(0);
        expect(item.redFlagIndicator.length).toBeGreaterThan(0);
      }
    }
  });

  it("item ids are unique within the fintech checklist", () => {
    const categories = checklistForDealType("fintech_ma");
    const ids = categories.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the generic checklist for an unrecognised deal type", () => {
    // @ts-expect-error deliberately testing the runtime fallback for a bad input
    const categories = checklistForDealType("not_a_real_type");
    expect(categories).toEqual(checklistForDealType("generic_ma"));
  });
});

describe("coverageForDeal", () => {
  it("marks an item covered when a matching department tag is present", () => {
    const results = coverageForDeal("fintech_ma", ["Financial Statements", "Cap Table"]);
    const finStatement = results.find((r) => r.itemId === "fin-01");
    const capTable = results.find((r) => r.itemId === "leg-01");
    expect(finStatement?.covered).toBe(true);
    expect(capTable?.covered).toBe(true);
  });

  it("marks an item uncovered when no ingested tag matches", () => {
    const results = coverageForDeal("fintech_ma", []);
    expect(results.every((r) => !r.covered)).toBe(true);
  });

  it("tag matching is case-insensitive", () => {
    const results = coverageForDeal("fintech_ma", ["financial statements"]);
    const finStatement = results.find((r) => r.itemId === "fin-01");
    expect(finStatement?.covered).toBe(true);
  });

  it("returns one result per checklist item", () => {
    const categories = checklistForDealType("fintech_ma");
    const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
    const results = coverageForDeal("fintech_ma", []);
    expect(results.length).toBe(totalItems);
  });
});

describe("gapsForDeal", () => {
  it("only returns uncovered items", () => {
    const gaps = gapsForDeal("fintech_ma", ["Financial Statements"]);
    expect(gaps.every((g) => !g.covered)).toBe(true);
    expect(gaps.find((g) => g.itemId === "fin-01")).toBeUndefined();
  });

  it("sorts gaps critical severity first", () => {
    const gaps = gapsForDeal("fintech_ma", []);
    const severities = gaps.map((g) => g.severity);
    const firstNonCritical = severities.findIndex((s) => s !== "critical");
    if (firstNonCritical !== -1) {
      // once we leave "critical", nothing after should be critical again
      expect(severities.slice(firstNonCritical).includes("critical")).toBe(false);
    }
  });

  it("with full coverage of all evidence tags, there are no gaps", () => {
    const categories = checklistForDealType("fintech_ma");
    const allTags = categories.flatMap((c) => c.items.flatMap((i) => i.evidenceTags));
    const gaps = gapsForDeal("fintech_ma", allTags);
    expect(gaps).toHaveLength(0);
  });
});

describe("IC_MEMO_TEMPLATE", () => {
  it("includes red flags and coverage gaps as first-class sections", () => {
    const keys = IC_MEMO_TEMPLATE.map((s) => s.key);
    expect(keys).toContain("red_flags");
    expect(keys).toContain("coverage_gaps");
    expect(keys).toContain("recommendation");
  });

  it("every section has non-empty guidance", () => {
    for (const section of IC_MEMO_TEMPLATE) {
      expect(section.guidance.length).toBeGreaterThan(0);
    }
  });
});
