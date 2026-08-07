import { describe, it, expect } from "vitest";
import { analyzeSourceCoverage } from "@/lib/services/source-coverage";

function ev(sourceType: string, department?: string) {
  return { sourceType, department };
}

describe("analyzeSourceCoverage", () => {
  it("returns 100% coverage when no departments have required sources", () => {
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "marketing"),
    ]);
    expect(result.coverageScore).toBe(100);
    expect(result.missingRequired).toEqual([]);
  });

  it("returns 100% when all required source types are covered", () => {
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "finance"),
      ev("csv", "finance"),
      ev("xlsx", "finance"),
    ]);
    expect(result.coverageScore).toBe(100);
    const finDept = result.departments.find((d) => d.department === "finance");
    expect(finDept?.missingSourceTypes).toEqual([]);
  });

  it("returns partial score when some required sources are missing", () => {
    // Finance requires pdf + csv + xlsx (3 required).
    // Only pdf present → 2 missing → score = (3 - 2) / 3 * 100 = 33.
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "finance"),
    ]);
    expect(result.coverageScore).toBe(33);
  });

  it("aggregates missing sources across departments", () => {
    // Finance needs pdf, csv, xlsx — only pdf present
    // Operations needs csv, pdf — only pdf present
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "finance"),
      ev("pdf", "operations"),
    ]);
    expect(result.missingRequired.length).toBeGreaterThan(0);
    // csv is missing from both finance and operations
    const csv = result.missingRequired.find((m) => m.sourceType === "csv");
    expect(csv?.requiredByDepartments).toContain("finance");
    expect(csv?.requiredByDepartments).toContain("operations");
  });

  it("counts source types correctly", () => {
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "finance"),
      ev("pdf", "finance"),
      ev("csv", "finance"),
    ]);
    const pdf = result.sourceTypes.find((s) => s.sourceType === "pdf");
    expect(pdf?.count).toBe(2);
    const csv = result.sourceTypes.find((s) => s.sourceType === "csv");
    expect(csv?.count).toBe(1);
  });

  it("groups evidence without department as uncategorized", () => {
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf"),
      ev("csv"),
    ]);
    const uncat = result.departments.find((d) => d.department === "uncategorized");
    expect(uncat?.evidenceCount).toBe(2);
    expect(uncat?.sourceTypes).toContain("pdf");
  });

  it("handles empty evidence array", () => {
    const result = analyzeSourceCoverage("ws-1", []);
    expect(result.totalEvidence).toBe(0);
    expect(result.sourceTypes).toEqual([]);
    expect(result.departments).toEqual([]);
    expect(result.coverageScore).toBe(100);
  });

  it("calculates score across multiple departments", () => {
    // Finance (3 required + 2 missing = 1 covered)
    // Operations (2 required + 1 missing = 1 covered)
    // Total: 5 required, 3 missing → (5-3)/5*100 = 40
    const result = analyzeSourceCoverage("ws-1", [
      ev("pdf", "finance"),
      ev("pdf", "operations"),
    ]);
    expect(result.coverageScore).toBe(40);
  });
});
