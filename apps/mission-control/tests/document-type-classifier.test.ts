import { describe, expect, it } from "vitest";
import {
  classifyDocument,
  documentTypesForDocuments,
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
import { checklistForDealType, type DealType } from "@/lib/domain/dd-checklist-library";

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

describe("classifyDocument content signal", () => {
  const ANNEX = "/deal/Project Falcon - Annex 4.pdf";

  it("types an opaquely named file from its opening lines", () => {
    // The real data room case: the filename is a code name, the document
    // states what it is in its own first sentence.
    const matches = classifyDocument({
      path: ANNEX,
      text: "AML Policy\n\nThis policy sets out the firm's approach to customer due diligence.",
    });
    expect(matches.map((m) => m.type)).toContain("AML Policy");
    expect(matches.find((m) => m.type === "AML Policy")?.signal).toBe("content");
  });

  it("does not type a document from a passing mention", () => {
    // The failure that would make coverage overstate: an AML policy that
    // references capital must not be typed as capital adequacy evidence.
    const body =
      "AML Policy\n\n" +
      "This policy sets out customer due diligence. ".repeat(20) +
      "It should be read alongside the paid-up capital position where relevant.";
    const types = classifyDocument({ path: ANNEX, text: body }).map((m) => m.type);
    expect(types).toContain("AML Policy");
    expect(types).not.toContain("Capital Adequacy Evidence");
  });

  it("types on recurrence when the phrase is not in the opening", () => {
    const filler = "General narrative about the transaction background. ".repeat(20);
    const matches = classifyDocument({
      path: ANNEX,
      text: `${filler} cap table ... ${filler} cap table ... ${filler} cap table ...`,
    });
    expect(matches.map((m) => m.type)).toContain("Cap Table");
  });

  it("prefers the filename signal when both fire", () => {
    // A type must never be reported as merely inferred when the author named
    // the file — the reviewer prompt should only appear where it is warranted.
    const matches = classifyDocument({
      path: "/deal/AML Policy.pdf",
      text: "AML Policy. This policy sets out customer due diligence.",
    });
    expect(matches.find((m) => m.type === "AML Policy")?.signal).toBe("filename");
    expect(matches.filter((m) => m.type === "AML Policy")).toHaveLength(1);
  });

  it("returns nothing for an opaque name and uninformative text", () => {
    expect(
      classifyDocument({ path: ANNEX, text: "Please find the attached materials. Regards." })
    ).toEqual([]);
    expect(classifyDocument({ path: ANNEX })).toEqual([]);
    expect(classifyDocument({})).toEqual([]);
  });

  it("de-duplicates types across a set of documents", () => {
    const types = documentTypesForDocuments([
      { path: "/a/AML Policy.pdf" },
      { path: ANNEX, text: "AML Policy\n\nCustomer due diligence approach." },
      { path: "/c/scan.pdf", text: "nothing useful" },
    ]);
    expect(types.filter((t) => t === "AML Policy")).toHaveLength(1);
  });
});

describe("vocabulary alignment with the requirement libraries", () => {
  // The bug this module was written to fix, in both places it occurred:
  // Meridian coverage and the Vantage diligence engine each matched content-
  // pack tags against a vocabulary that shared no values with them, so nothing
  // could ever be covered. This makes that mismatch impossible to reintroduce
  // silently in either library.
  const requirementTags = new Set([
    ...REGULATORS.flatMap((r) => r.licenseTypes)
      .filter((t) => hasDedicatedRequirementPack(t.key))
      .flatMap((t) =>
        (["aspirational", "existing"] as LicenseStatus[]).flatMap((s) =>
          requirementsFor(t.key, s).flatMap((i) => i.evidenceTags)
        )
      ),
    ...(["fintech_ma", "generic_ma"] as DealType[]).flatMap((d) =>
      checklistForDealType(d).flatMap((c) => c.items.flatMap((i) => i.evidenceTags))
    ),
  ]);

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
      // DD checklist vocabulary
      "Cap table.xlsx",
      "Management accounts.xlsx",
      "Cash flow forecast.xlsx",
      "Revenue analysis by cohort.xlsx",
      "Unit economics.xlsx",
      "Litigation register.xlsx",
      "IP assignment register.pdf",
      "Change of control clause summary.docx",
      "Retention and earn-out terms.docx",
      "Org chart.pdf",
      "Penetration test results.pdf",
    ];
    const reached = new Set(documentTypesForPaths(samples));
    const missed = [...requirementTags].filter((tag) => !reached.has(tag)).sort();
    expect(missed, `no sample filename reaches: ${missed.join(", ")}`).toEqual([]);
  });
});
