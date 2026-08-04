/**
 * Meridian requirement coverage.
 *
 * GET /api/meridian/coverage
 *
 * Turns the Submission Room's coverage figures from a worked example into real
 * output. Joins three things that already exist separately:
 *
 *   meridian_scope           what licence the workspace is testing
 *   requirement library      what that licence demands (domain-reviewed)
 *   evidence_records         what the workspace has actually ingested
 *
 * The match is on evidence DEPARTMENT TAGS, the same mechanism ingestion and
 * retrieval already use, rather than a new bespoke matcher. Reusing it means a
 * document that counts as HR evidence for Ask also counts as HR evidence for a
 * requirement, which is the behaviour a compliance analyst would expect.
 *
 * BOUNDARY. Coverage means "a document carrying the right tag exists". It does
 * NOT mean the requirement is satisfied — that is a judgement only a qualified
 * reviewer makes. The response says so explicitly and the UI repeats it,
 * because "82% covered" quietly becoming "82% compliant" in someone's head is
 * the single most dangerous misreading this screen can produce.
 */

import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import {
  coverageForSubmission,
  hasDedicatedRequirementPack,
  requirementsFor,
  type LicenseStatus,
  type RequirementCoverageResult,
} from "@/lib/domain/regulatory-requirement-library";
import { librarySetsFor, selectionRationale } from "@/lib/meridian-requirement-selection";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const scope = await repository.getMeridianScope(auth.workspaceId);
  if (!scope) {
    return ok({
      configured: false,
      reason: "no_scope",
      requirements: [],
      coverage: [],
      gaps: [],
    });
  }

  // Scopes saved before migration 0042 carry a free-text licence label but no
  // library key. Guessing a pack from the label would risk showing the wrong
  // regulator's obligations, which is worse than showing none.
  if (!scope.licenseTypeKey) {
    return ok({
      configured: false,
      reason: "no_license_type_key",
      licenseType: scope.licenseType,
      requirements: [],
      coverage: [],
      gaps: [],
    });
  }

  const sets: LicenseStatus[] = librarySetsFor(scope.licenseStatus);

  // Department tags on ingested evidence are the coverage input. Restricted
  // records are excluded: a document the caller may not read cannot honestly
  // be counted as evidence they hold.
  const evidence = await repository.getEvidenceForWorkspace(auth.workspaceId);
  const usable = evidence.filter((record) => record.sensitivity !== "restricted");
  const restrictedCount = evidence.length - usable.length;
  const departmentTags = [
    ...new Set(usable.map((record) => record.department).filter((d): d is string => Boolean(d))),
  ];

  // Union across the applicable sets, de-duplicated by requirement id. An
  // applicant sees both sets (see librarySetsFor) and a requirement that
  // appears in both must not be double-counted in the percentage.
  const byId = new Map<string, RequirementCoverageResult>();
  for (const set of sets) {
    for (const result of coverageForSubmission(scope.licenseTypeKey, set, departmentTags)) {
      const existing = byId.get(result.itemId);
      // If it appears twice, covered in either context counts as covered.
      if (!existing || (!existing.covered && result.covered)) byId.set(result.itemId, result);
    }
  }
  const coverage = [...byId.values()];

  const severityOrder = { critical: 0, high: 1, medium: 2 } as const;
  const gaps = coverage
    .filter((r) => !r.covered)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const total = coverage.length;
  const covered = total - gaps.length;

  // Requirement detail for the library screen, same de-duplication.
  const requirementById = new Map<string, ReturnType<typeof requirementsFor>[number]>();
  for (const set of sets) {
    for (const item of requirementsFor(scope.licenseTypeKey, set)) {
      if (!requirementById.has(item.id)) requirementById.set(item.id, item);
    }
  }

  return ok({
    configured: true,
    scope: {
      jurisdiction: scope.jurisdiction,
      regulator: scope.regulator,
      licenseType: scope.licenseType,
      licenseTypeKey: scope.licenseTypeKey,
      licenseStatus: scope.licenseStatus,
      deadline: scope.deadline ?? null,
    },
    selection: {
      sets,
      rationale: selectionRationale(scope.licenseStatus),
      // Only some licences have a purpose-built pack; the rest fall back to a
      // generic set. Saying which is which is not optional — an unlabelled
      // generic pack shown as "the requirement library" is a false claim.
      packSource: hasDedicatedRequirementPack(scope.licenseTypeKey)
        ? ("dedicated" as const)
        : ("generic" as const),
    },
    requirements: [...requirementById.values()],
    coverage,
    gaps,
    totals: {
      total,
      covered,
      // Null rather than 0/0 = NaN, and null rather than a fabricated 100%
      // when a licence has no requirements recorded yet.
      coveragePercent: total > 0 ? Math.round((covered / total) * 100) : null,
      criticalGaps: gaps.filter((g) => g.severity === "critical").length,
      evidenceDocuments: usable.length,
      restrictedExcluded: restrictedCount,
    },
    boundary:
      "Coverage means a document carrying the matching evidence tag exists. It " +
      "is not a finding that the requirement is satisfied; a qualified reviewer " +
      "makes that judgement.",
  });
}
