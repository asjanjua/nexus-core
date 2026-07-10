/**
 * GET /api/export/risk-radar
 *
 * Returns the risk radar as JSON (?format=json, default) or CSV (?format=csv).
 * Risk signals are extracted deterministically — no LLM call.
 *
 * Scope: read:dashboard
 */

import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildRiskRadar } from "@/lib/services/exports";
import { ok, fail } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  const workspaceName = settings?.name ?? ctx.workspaceId;

  try {
    const radar = await buildRiskRadar(ctx.workspaceId, workspaceName);

    if (format === "csv") {
      const rows = [
        ["Severity", "Title", "Department", "Source File", "Freshness (hours)", "Evidence ID"],
        ...radar.high.map(r => ["HIGH", r.title, r.department, r.source, String(r.freshnessHours), r.evidenceId]),
        ...radar.medium.map(r => ["MEDIUM", r.title, r.department, r.source, String(r.freshnessHours), r.evidenceId]),
        ...radar.low.map(r => ["LOW", r.title, r.department, r.source, String(r.freshnessHours), r.evidenceId]),
      ];
      const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const filename = `risk-radar-${workspaceName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return ok({ radar });
  } catch (err) {
    const message = err instanceof Error ? err.message : "export_failed";
    return fail(message, 500);
  }
}
