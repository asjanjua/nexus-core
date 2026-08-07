/**
 * GET /api/meridian/requirement-coverage
 *
 * Merges the Meridian scope/license profile with the regulatory
 * requirement library and ingested evidence to produce a coverage
 * gap report. Shows which requirements are met vs pending per
 * regulator + license type.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { licenseTypesForRegulator, REGULATORS } from "@/lib/domain/regulatory-requirement-library";
import type { LicenseType, RegulatorKey } from "@/lib/domain/regulatory-requirement-library";
import type { EvidenceRecord } from "@/lib/contracts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    // Get Meridian scope profile from workspace settings.
    const scope = await repository.getMeridianScope(auth.ctx.workspaceId);
    const regulator = scope?.regulator ?? null;

    if (!regulator) {
      return ok({
        generatedAt: new Date().toISOString(),
        status: "not_configured",
        message: "Meridian scope not configured. Set regulator and license type in Meridian settings.",
        requirements: [],
        evidence: [],
      });
    }

    // Get applicable license types for this regulator.
    const licenseTypes = licenseTypesForRegulator(regulator as RegulatorKey);

    // Get evidence for coverage detection.
    const evidence: EvidenceRecord[] = await repository.getEvidenceForWorkspace(auth.ctx.workspaceId);

    // Build coverage entries per license type.
    const requirements = licenseTypes.map((lt: LicenseType) => {
      const evidenceTypes = new Set(
        evidence
          .filter((e) => e.department === "compliance" || e.department === "regulatory")
          .map((e) => e.sourceType.toLowerCase()),
      );

      // Required document types for this license type (heuristic).
      const requiredDocs = lt.key.includes("banking")
        ? ["pdf", "xlsx", "csv"]
        : lt.key.includes("asset")
        ? ["pdf", "xlsx"]
        : ["pdf", "docx", "csv"];

      const missing = requiredDocs.filter((d) => !evidenceTypes.has(d));
      const covered = requiredDocs.filter((d) => evidenceTypes.has(d));

      return {
        licenseType: lt.key,
        label: lt.label,
        requiredSourceTypes: requiredDocs,
        coveredSourceTypes: covered,
        missingSourceTypes: missing,
        coveragePercent:
          requiredDocs.length > 0 ? Math.round((covered.length / requiredDocs.length) * 100) : 100,
        evidenceCount: evidence.filter(
          (e) => e.department === "compliance" || e.department === "regulatory",
        ).length,
      };
    });

    return ok({
      generatedAt: new Date().toISOString(),
      regulator,
      regulatorName: REGULATORS.find((r) => r.key === regulator)?.label ?? regulator,
      licenseStatus: (scope as Record<string, unknown>)?.licenseStatus ?? "not_licensed",
      requirements,
      totalEvidence: evidence.length,
    });
  } catch (_err) {
    return fail("requirement_coverage_failed", 500);
  }
}
