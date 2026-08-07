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

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const evidence = await repository.getEvidenceForWorkspace(auth.ctx.workspaceId);
    const result = analyzeSourceCoverage(
      auth.ctx.workspaceId,
      evidence.map((e: Record<string, unknown>) => ({
        sourceType: (e.sourceType as string) ?? "unknown",
        department: e.department as string | null,
      })),
    );
    return ok(result);
  } catch (_err) {
    return fail("source_coverage_failed", 500);
  }
}
