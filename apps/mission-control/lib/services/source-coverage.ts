/**
 * Source Coverage Map — detects source type coverage across
 * departments and identifies gaps before weak-evidence outputs happen.
 *
 * Used by the admin dashboard and executive summary to show
 * "what sources are connected" vs "what's still missing."
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceCoverageResult {
  generatedAt: string;
  workspaceId: string;
  /** Total evidence records ingested. */
  totalEvidence: number;
  /** Coverage per source type. */
  sourceTypes: SourceTypeCoverage[];
  /** Coverage per department. */
  departments: DepartmentCoverage[];
  /** Required sources that are missing across all departments. */
  missingRequired: MissingSource[];
  /** Overall coverage score 0-100. */
  coverageScore: number;
}

export interface SourceTypeCoverage {
  sourceType: string;
  count: number;
  departments: string[];
}

export interface DepartmentCoverage {
  department: string;
  sourceTypes: string[];
  evidenceCount: number;
  /** Required source types for this department. */
  requiredSourceTypes: string[];
  /** Required source types that are missing. */
  missingSourceTypes: string[];
}

export interface MissingSource {
  sourceType: string;
  requiredByDepartments: string[];
}

// ---------------------------------------------------------------------------
// Required source types per department — what's needed for strong outputs.
// ---------------------------------------------------------------------------

const REQUIRED_SOURCES_BY_DEPARTMENT: Record<string, string[]> = {
  finance: ["pdf", "csv", "xlsx"],
  operations: ["csv", "pdf"],
  people: ["pdf", "docx"],
  legal: ["pdf", "docx"],
  board: ["pdf", "docx", "csv"],
  risk: ["pdf", "csv"],
  growth: ["csv", "pdf"],
  technology: ["csv", "pdf", "docx"],
};

// ---------------------------------------------------------------------------
// Coverage engine
// ---------------------------------------------------------------------------

export function analyzeSourceCoverage(
  workspaceId: string,
  evidence: Array<{
    sourceType: string;
    department?: string | null;
  }>,
): SourceCoverageResult {
  // 1. Source type counts
  const sourceTypeMap = new Map<string, { count: number; departments: Set<string> }>();
  for (const e of evidence) {
    const st = e.sourceType.toLowerCase();
    const entry = sourceTypeMap.get(st) ?? { count: 0, departments: new Set() };
    entry.count++;
    if (e.department) entry.departments.add(e.department);
    sourceTypeMap.set(st, entry);
  }

  const sourceTypes: SourceTypeCoverage[] = Array.from(sourceTypeMap.entries())
    .map(([type, data]) => ({
      sourceType: type,
      count: data.count,
      departments: Array.from(data.departments),
    }))
    .sort((a, b) => b.count - a.count);

  // 2. Department coverage
  const deptMap = new Map<string, { sourceTypes: Set<string>; evidenceCount: number }>();
  for (const e of evidence) {
    const dept = e.department ?? "uncategorized";
    const entry = deptMap.get(dept) ?? { sourceTypes: new Set<string>(), evidenceCount: 0 };
    entry.sourceTypes.add(e.sourceType.toLowerCase());
    entry.evidenceCount++;
    deptMap.set(dept, entry);
  }

  const departments: DepartmentCoverage[] = Array.from(deptMap.entries())
    .map(([dept, data]) => {
      const required = REQUIRED_SOURCES_BY_DEPARTMENT[dept] ?? [];
      const haveSet = data.sourceTypes;
      const missing = required.filter((r) => !haveSet.has(r));
      return {
        department: dept,
        sourceTypes: Array.from(data.sourceTypes),
        evidenceCount: data.evidenceCount,
        requiredSourceTypes: required,
        missingSourceTypes: missing,
      };
    })
    .sort((a, b) => b.evidenceCount - a.evidenceCount);

  // 3. Missing required sources (aggregated across departments)
  const missingMap = new Map<string, Set<string>>();
  for (const dept of departments) {
    for (const missing of dept.missingSourceTypes) {
      const entry = missingMap.get(missing) ?? new Set();
      entry.add(dept.department);
      missingMap.set(missing, entry);
    }
  }

  const missingRequired: MissingSource[] = Array.from(missingMap.entries()).map(
    ([type, depts]) => ({
      sourceType: type,
      requiredByDepartments: Array.from(depts),
    }),
  );

  // 4. Coverage score: % of required source types that are covered.
  const totalRequired = departments.reduce((s, d) => s + d.requiredSourceTypes.length, 0);
  const totalMissing = departments.reduce((s, d) => s + d.missingSourceTypes.length, 0);
  const coverageScore =
    totalRequired > 0 ? Math.round(((totalRequired - totalMissing) / totalRequired) * 100) : 100;

  return {
    generatedAt: new Date().toISOString(),
    workspaceId,
    totalEvidence: evidence.length,
    sourceTypes,
    departments,
    missingRequired,
    coverageScore,
  };
}
