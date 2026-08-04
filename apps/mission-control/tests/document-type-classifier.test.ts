import { describe, expect, it } from "vitest";
import {
  documentTypesForFilename,
  documentTypesForPaths,
  knownDocumentTypes,
} from "@/lib/domain/document-type-classifier";
import {
  REGULATORS,
  hasDedicatedRequirementPack,
  requirementsFor,
  type LicenseStatus,
} from "@/lib/domain/regulatory-requirement-library";

describe("documentTypesForFilename", () => {
  it("returns nothing for an unidentifiable filename", () => {
    // Must be empty, not a guess. A wrong type silently marks a requirement
    // covered, which is the one failure this screen cannot afford.
    for (const name of ["scan_001.pdf", "final v3.docx", "IMG_4821.png", "untitled.xlsx"]) {
      expect(documentTypesForFilename(name)).toEqual([]);
    }
  });

  it("handles null, undefined, and empty input", () => {
    expect(documentTypesForFilename(null)).toEqual([]);
    expect(documentTypesForFilename(undefined)).toEqual([]);
    expect(documentTypesForFilename("")).toEqual([]);
    expect(documentTypesForFilename("/some/dir/")).toEqual([]);
  });

  it("matches on the basename, not the directory", () => {
    // A /compliance/ folder must not type every file beneath it.
    expect(documentTypesForFilename("/compliance/photo.jpg")).toEqual([]);
    expect(documentTypesForFilename("/random/AML Policy 2026.pdf")).toContain("AML Policy");
  });

  it("identifies the core regulatory document types", () => {
    const cases: Array<[string, string]> = [
      ["AML Policy v4.pdf", "AML Policy"],
      ["Independent AML Audit Report 2026.pdf", "AML Audit"],
      ["Capital Adequacy Certificate.pdf", "Capital Adequacy Evidence"],
      ["Audited Financial Statements FY25.pdf", "Financial Statements"],
      ["Fit and Proper - Director Khan.pdf", "Fit and Proper Certification"],
      ["EMI Licence SBP.pdf", "Regulatory License"],
      ["SBP letter - observations on application.pdf", "Regulatory Correspondence"],
      ["Quarterly Regulatory Returns Q1.xlsx", "Regulatory Returns"],
      ["Trust Account Agreement - safeguarding.pdf", "Customer Funds Safeguarding"],
      ["Daily float reconciliation Jan.xlsx", "Reconciliation Reports"],
      ["Pilot Exit Report.docx", "Pilot Operations Report"],
      ["IS Audit Report 2026.pdf", "IS Audit Report"],
      ["BCP DR test drill results.docx", "BCP DR Test Report"],
      ["Business Plan and feasibility.docx", "Business Plan"],
      ["Data Protection and PDPL compliance note.docx", "Data Protection Compliance"],
      ["Vendor risk assessment - core banking.xlsx", "Vendor Risk Assessment"],
      ["Consumer protection charter.pdf", "Client Protection Policy"],
      ["Settlement bank agreement.pdf", "Settlement Arrangements"],
    ];
    for (const [filename, expected] of cases) {
      expect(documentTypesForFilename(filename), filename).toContain(expected);
    }
  });

  it("can return several types for one document", () => {
    const types = documentTypesForFilename("AML Policy and Independent Audit 2026.pdf");
    expect(types).toContain("AML Policy");
    expect(types).toContain("AML Audit");
  });

  it("de-duplicates across a set of paths", () => {
    const types = documentTypesForPaths([
      "/a/AML Policy.pdf",
      "/b/AML Policy (copy).pdf",
      null,
      "scan.pdf",
    ]);
    expect(types.filter((t) => t === "AML Policy")).toHaveLength(1);
  });
});

describe("vocabulary alignment with the requirement libraries", () => {
  // The bug this module was written to fix: coverage matched requirement tags
  // against a vocabulary that shared no values with them, so nothing could
  // ever be covered. This test makes that class of mismatch impossible to
  // reintroduce silently.
  const requirementTags = new Set(
    REGULATORS.flatMap((r) => r.licenseTypes)
      .filter((t) => hasDedicatedRequirementPack(t.key))
      .flatMap((t) =>
        (["aspirational", "existing"] as LicenseStatus[]).flatMap((s) =>
          requirementsFor(t.key, s).flatMap((i) => i.evidenceTags)
        )
      )
  );

  it("can produce every evidence tag the requirement packs ask for", () => {
    const producible = new Set(knownDocumentTypes());
    const unreachable = [...requirementTags].filter((tag) => !producible.has(tag)).sort();
    // A requirement tag no classifier rule can emit is a permanent gap: no
    // amount of ingestion could ever close it.
    expect(unreachable, `unreachable requirement tags: ${unreachable.join(", ")}`).toEqual([]);
  });

  it("has at least one worked filename example reaching each pack tag", () => {
    // Guards against a rule that exists but is so narrow nothing matches it.
    const samples = [
      "AML Policy.pdf",
      "AML Audit Report.pdf",
      "Compliance Manual.pdf",
      "Capital Adequacy Certificate.pdf",
      "Audited Financial Statements.pdf",
      "Fit and Proper declaration.pdf",
      "EMI licence.pdf",
      "SBP correspondence letter.pdf",
      "Regulatory Returns Q1.xlsx",
      "Pilot operations report.docx",
      "Customer funds safeguarding agreement.pdf",
      "Float reconciliation.xlsx",
      "Customer onboarding CDD procedure.pdf",
      "IS Audit Report.pdf",
      "Architecture overview.pdf",
      "Data protection PDPL note.docx",
      "Outsourcing vendor risk assessment.xlsx",
      "Material contract - MSA.pdf",
      "Consumer protection policy.pdf",
      "Complaints report Q1.xlsx",
      "BCP DR test report.docx",
      "Security incident report log.xlsx",
      "IT risk framework.pdf",
      "Business plan.docx",
      "Settlement participant agreement.pdf",
      "Related party disclosures.xlsx",
      "Shariah compliance certificate.pdf",
      "Portfolio at risk report.xlsx",
      "Lease portfolio report.xlsx",
      "Fund performance factsheet.pdf",
    ];
    const reached = new Set(documentTypesForPaths(samples));
    const missed = [...requirementTags].filter((tag) => !reached.has(tag)).sort();
    expect(missed, `no sample filename reaches: ${missed.join(", ")}`).toEqual([]);
  });
});
