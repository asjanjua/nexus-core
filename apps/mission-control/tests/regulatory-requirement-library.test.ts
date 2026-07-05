import { describe, expect, it } from "vitest";
import {
  REGULATORS,
  licenseTypesForRegulator,
  requirementsFor,
  coverageForSubmission,
  gapsForSubmission,
} from "@/lib/domain/regulatory-requirement-library";

describe("REGULATORS / licenseTypesForRegulator", () => {
  it("lists SECP first, matching the corrected entry priority", () => {
    expect(REGULATORS[0].key).toBe("secp");
  });

  it("includes all four regulators", () => {
    const keys = REGULATORS.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(["secp", "sbp", "sama", "cbuae"]));
  });

  it("returns SECP's license types", () => {
    const types = licenseTypesForRegulator("secp");
    expect(types.length).toBeGreaterThanOrEqual(5);
    expect(types.map((t) => t.key)).toContain("secp_nbfc_microfinance");
  });

  it("every license type is tagged with its own regulator", () => {
    for (const regulator of REGULATORS) {
      for (const license of regulator.licenseTypes) {
        expect(license.regulator).toBe(regulator.key);
      }
    }
  });

  it("returns an empty array for an unrecognised regulator key", () => {
    // @ts-expect-error deliberately testing the runtime fallback for a bad input
    expect(licenseTypesForRegulator("not_a_regulator")).toEqual([]);
  });
});

describe("requirementsFor", () => {
  it("filters to only aspirational items for a new SECP microfinance application", () => {
    const items = requirementsFor("secp_nbfc_microfinance", "aspirational");
    expect(items.every((i) => i.appliesTo.includes("aspirational"))).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("filters to only existing items for an established SECP microfinance license", () => {
    const items = requirementsFor("secp_nbfc_microfinance", "existing");
    expect(items.every((i) => i.appliesTo.includes("existing"))).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("an item that applies to both statuses appears in both filtered lists", () => {
    const aspirational = requirementsFor("secp_nbfc_microfinance", "aspirational");
    const existing = requirementsFor("secp_nbfc_microfinance", "existing");
    const bothIds = aspirational
      .filter((a) => existing.some((e) => e.id === a.id))
      .map((i) => i.id);
    expect(bothIds.length).toBeGreaterThan(0);
  });

  it("falls back to the generic placeholder for a license type not yet built out", () => {
    const items = requirementsFor("sbp_emi", "aspirational");
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.id.startsWith("generic-"))).toBe(true);
  });

  it("every requirement item has a non-empty gap indicator and at least one evidence tag", () => {
    for (const licenseKey of ["secp_nbfc_investment_finance", "secp_nbfc_leasing", "secp_modaraba", "secp_amc"]) {
      const items = requirementsFor(licenseKey, "existing").concat(requirementsFor(licenseKey, "aspirational"));
      for (const item of items) {
        expect(item.gapIndicator.length).toBeGreaterThan(0);
        expect(item.evidenceTags.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("coverageForSubmission / gapsForSubmission", () => {
  it("marks an item covered when a matching department tag is present", () => {
    const results = coverageForSubmission("secp_nbfc_microfinance", "existing", ["AML Policy"]);
    const amlItem = results.find((r) => r.itemId === "secp-mf-03");
    expect(amlItem?.covered).toBe(true);
  });

  it("with no ingested evidence, every item is a gap", () => {
    const gaps = gapsForSubmission("secp_nbfc_microfinance", "aspirational", []);
    const total = requirementsFor("secp_nbfc_microfinance", "aspirational").length;
    expect(gaps).toHaveLength(total);
  });

  it("gaps are sorted critical severity first", () => {
    const gaps = gapsForSubmission("secp_amc", "existing", []);
    const firstNonCritical = gaps.findIndex((g) => g.severity !== "critical");
    if (firstNonCritical !== -1) {
      expect(gaps.slice(firstNonCritical).some((g) => g.severity === "critical")).toBe(false);
    }
  });

  it("with full evidence coverage, there are no gaps", () => {
    const items = requirementsFor("secp_modaraba", "existing");
    const allTags = items.flatMap((i) => i.evidenceTags);
    const gaps = gapsForSubmission("secp_modaraba", "existing", allTags);
    expect(gaps).toHaveLength(0);
  });

  it("tag matching is case-insensitive", () => {
    const results = coverageForSubmission("secp_nbfc_microfinance", "existing", ["aml policy"]);
    const amlItem = results.find((r) => r.itemId === "secp-mf-03");
    expect(amlItem?.covered).toBe(true);
  });
});
