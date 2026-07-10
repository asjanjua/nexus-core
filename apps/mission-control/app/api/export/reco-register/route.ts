/**
 * GET /api/export/reco-register
 *
 * Returns the recommendation register as JSON or CSV.
 * Direct data extraction — no LLM call. Audit-safe export.
 *
 * Scope: read:dashboard
 */

import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildRecoRegister } from "@/lib/services/exports";
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
    const register = await buildRecoRegister(ctx.workspaceId, workspaceName);

    if (format === "csv") {
      const rows = [
        ["ID", "Title", "Status", "Owner", "Confidence %", "Evidence Refs", "Created", "Updated"],
        ...register.rows.map(r => [
          r.id,
          r.title,
          r.status,
          r.owner,
          String(Math.round(r.confidence * 100)),
          r.evidenceRefs.join("; "),
          r.createdAt.slice(0, 10),
          r.updatedAt.slice(0, 10),
        ]),
      ];
      const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const filename = `recommendations-${workspaceName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return ok({ register });
  } catch (err) {
    const message = err instanceof Error ? err.message : "export_failed";
    return fail(message, 500);
  }
}
