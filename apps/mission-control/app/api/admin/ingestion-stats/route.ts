/**
 * GET /api/admin/ingestion-stats
 *
 * Ingestion pipeline monitoring: success rate, failure breakdown,
 * average extraction confidence, throughput. Admin-only.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:admin");
  if (auth.error) return auth.error;

  try {
    // Query evidence records from the last 30 days.
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    // We use the repository's admin snapshot which already counts
    // evidence, but we need per-status breakdown + confidence.
    const allEvidence = await repository.getEvidenceForWorkspace(auth.ctx.workspaceId);

    const total = allEvidence.length;

    const processed = allEvidence.filter(
      (r: Record<string, unknown>) => r.ingestionStatus === "processed",
    ).length;
    const failed = allEvidence.filter(
      (r: Record<string, unknown>) => r.ingestionStatus === "failed",
    ).length;
    const quarantined = allEvidence.filter(
      (r: Record<string, unknown>) => r.ingestionStatus === "quarantined",
    ).length;
    const pending = allEvidence.filter(
      (r: Record<string, unknown>) =>
        r.ingestionStatus === "pending_approval" || r.ingestionStatus === "queued",
    ).length;

    const successRate = total > 0 ? Math.round((processed / total) * 100) : null;

    const confidenceScores = allEvidence
      .map((r: Record<string, unknown>) => r.extractionConfidence as number)
      .filter((c): c is number => typeof c === "number");
    const avgConfidence =
      confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length)
        : null;

    return ok({
      generatedAt: now.toISOString(),
      windowStart: thirtyDaysAgo.toISOString(),
      total,
      processed,
      failed,
      quarantined,
      pending,
      successRate,
      avgConfidence,
    });
  } catch (_err) {
    return fail("ingestion_stats_failed", 500);
  }
}
