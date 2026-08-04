import { describe, expect, it } from "vitest";
import {
  librarySetsFor,
  selectionRationale,
} from "@/lib/meridian-requirement-selection";
import type { MeridianLicenseStatus } from "@/lib/contracts";
import {
  REGULATORS,
  coverageForSubmission,
  hasDedicatedRequirementPack,
  requirementsFor,
  type LicenseStatus,
} from "@/lib/domain/regulatory-requirement-library";

const ALL_STATUSES: MeridianLicenseStatus[] = [
  "not_licensed",
  "applicant",
  "licensed",
  "variation",
  "renewal",
];

describe("librarySetsFor", () => {
  it("never returns an empty set", () => {
    // An empty pack renders as 0 of 0 requirements, which reads as
    // "nothing outstanding". That is the worst possible failure mode here.
    for (const status of ALL_STATUSES) {
      expect(librarySetsFor(status).length).toBeGreaterThan(0);
    }
  });

  it("shows an applicant both sets", () => {
    expect(librarySetsFor("applicant").sort()).toEqual(["aspirational", "existing"]);
  });

  it("shows an unlicensed entity only the get-licensed set", () => {
    expect(librarySetsFor("not_licensed")).toEqual(["aspirational"]);
  });

  it("shows holders of a permission only the ongoing set", () => {
    for (const status of ["licensed", "variation", "renewal"] as const) {
      expect(librarySetsFor(status)).toEqual(["existing"]);
    }
  });

  it("falls back to both sets for an unrecognised status", () => {
    // Conservative default: over-report obligations rather than hide them.
    const sets = librarySetsFor("something_new" as MeridianLicenseStatus);
    expect(sets.sort()).toEqual(["aspirational", "existing"]);
  });
});

describe("selectionRationale", () => {
  it("gives a distinct reason for every status", () => {
    const reasons = ALL_STATUSES.map(selectionRationale);
    expect(new Set(reasons).size).toBe(ALL_STATUSES.length);
    for (const r of reasons) expect(r.length).toBeGreaterThan(0);
  });
});

describe("coverage union across sets", () => {
  // The applicant case unions two sets. A requirement that appears in both
  // must be counted once, or the percentage silently understates coverage.
  // A licence with a purpose-built pack, not the generic fallback.
  const licenseKey = "secp_nbfc_investment_finance";
  const sets = librarySetsFor("applicant");

  it("de-duplicates requirements shared by both sets", () => {
    const flat = sets.flatMap((s: LicenseStatus) => requirementsFor(licenseKey, s));
    const unique = new Set(flat.map((r) => r.id));
    // If this is not true the de-duplication in the coverage route is dead
    // code and this test is guarding nothing — assert the overlap is real.
    expect(flat.length).toBeGreaterThan(unique.size);
  });

  it("counts a shared requirement as covered if either context covers it", () => {
    const byId = new Map<string, { itemId: string; covered: boolean }>();
    for (const set of sets as LicenseStatus[]) {
      for (const result of coverageForSubmission(licenseKey, set, ["Compliance"])) {
        const existing = byId.get(result.itemId);
        if (!existing || (!existing.covered && result.covered)) byId.set(result.itemId, result);
      }
    }
    const flat = sets.flatMap((s: LicenseStatus) =>
      coverageForSubmission(licenseKey, s, ["Compliance"])
    );
    expect(byId.size).toBeLessThan(flat.length);
    for (const [id, merged] of byId) {
      const anyCovered = flat.some((r) => r.itemId === id && r.covered);
      expect(merged.covered).toBe(anyCovered);
    }
  });
});

describe("requirement library integrity", () => {
  it("gives every licence type at least one requirement in at least one set", () => {
    // A licence in the picker with no requirements would show a user an empty
    // coverage screen that looks like a clean bill of health.
    for (const regulator of REGULATORS) {
      for (const type of regulator.licenseTypes) {
        const total =
          requirementsFor(type.key, "aspirational").length +
          requirementsFor(type.key, "existing").length;
        expect(total, `${type.key} has no requirements`).toBeGreaterThan(0);
      }
    }
  });

  it("records exactly which licences still use the generic fallback", () => {
    // Pinned deliberately. When a real SBP EMI pack lands this test fails and
    // whoever adds it must move the key out of this list — which is the point.
    // Until then the UI must label these as generic (GENERIC_PACK_NOTICE).
    const generic = REGULATORS.flatMap((r) =>
      r.licenseTypes.filter((t) => !hasDedicatedRequirementPack(t.key)).map((t) => t.key)
    ).sort();
    expect(generic).toEqual([
      "cbuae_sva_ppi",
      "sama_payment_services",
      "sbp_emi",
      "sbp_pspo",
    ]);
  });

  it("gives every requirement at least one evidence tag", () => {
    // A requirement with no tags can never be covered, so it would sit as a
    // permanent gap no amount of ingestion could clear.
    for (const regulator of REGULATORS) {
      for (const type of regulator.licenseTypes) {
        for (const set of ["aspirational", "existing"] as LicenseStatus[]) {
          for (const item of requirementsFor(type.key, set)) {
            expect(item.evidenceTags.length, `${item.id} has no evidence tags`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
