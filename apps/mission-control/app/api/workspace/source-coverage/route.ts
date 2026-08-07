/**
 * GET /api/workspace/source-coverage
 *
 * Returns source type coverage across departments for the current
 * workspace. Shows what sources are connected vs missing.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { analyzeSourceCoverage } from "@/lib/services/source-coverage";
import type { EvidenceRecord } from "@/lib/contracts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const evidence: EvidenceRecord[] = await repository.getEvidenceForWorkspace(
      auth.ctx.workspaceId,
    );
    const result = analyzeSourceCoverage(
      auth.ctx.workspaceId,
      evidence.map((e) => ({
        sourceType: e.sourceType,
        department: e.department,
      })),
    );
    return ok(result);
  } catch (_err) {
    return fail("source_coverage_failed", 500);
  }
}
