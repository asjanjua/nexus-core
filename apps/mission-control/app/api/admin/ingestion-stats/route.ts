/**
 * GET /api/admin/ingestion-stats
 *
 * Ingestion pipeline monitoring: success rate, failure breakdown,
 * average extraction confidence. Admin-only (read:admin scope).
 *
 * Queries evidence records for the authenticated admin's workspace —
 * the admin workspace IS the platform view in the current architecture.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import type { EvidenceRecord } from "@/lib/contracts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:admin");
  if (auth.error) return auth.error;

  try {
    // Fetch all evidence for the admin workspace.
    // The admin workspace aggregates the platform view.
    const all: EvidenceRecord[] = await repository.getEvidenceForWorkspace(
      auth.ctx.workspaceId,
    );

    const total = all.length;

    const processed = all.filter((r) => r.ingestionStatus === "processed").length;
    const failed = all.filter((r) => r.ingestionStatus === "failed").length;
    const quarantined = all.filter((r) => r.ingestionStatus === "quarantined").length;
    const pending = all.filter(
      (r) => r.ingestionStatus === "pending_approval" || r.ingestionStatus === "queued",
    ).length;

    const successRate = total > 0 ? Math.round((processed / total) * 100) : null;

    const confidenceScores = all
      .map((r) => r.extractionConfidence)
      .filter((c): c is number => typeof c === "number");
    const avgConfidence =
      confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length)
        : null;

    return ok({
      generatedAt: new Date().toISOString(),
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
