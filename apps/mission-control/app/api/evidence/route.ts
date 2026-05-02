/**
 * GET /api/evidence
 *
 * Returns all evidence records for the authenticated workspace.
 * Supports optional ?status= filter for the approval screen (Task 23).
 *
 * Query params:
 *   status  — filter by ingestionStatus (e.g. "pending_approval", "processed")
 *   limit   — max results (default 100)
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? null;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);

  let rows = await repository.getEvidenceForWorkspace(ctx.workspaceId);

  if (statusFilter) {
    rows = rows.filter((r) => r.ingestionStatus === statusFilter);
  }

  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    sourcePath: r.sourcePath,
    sourceType: r.sourceType,
    ingestionStatus: r.ingestionStatus,
    extractionConfidence: r.extractionConfidence,
    sensitivity: r.sensitivity,
    freshnessHours: r.freshnessHours,
    ingestedAt: r.ingestedAt,
    workspaceId: r.workspaceId,
  }));

  return ok({
    workspaceId: ctx.workspaceId,
    total: items.length,
    items,
  });
}
