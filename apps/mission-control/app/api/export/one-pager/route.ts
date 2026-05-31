/**
 * GET /api/export/one-pager
 *
 * Returns the executive one-pager summary as JSON for print-page rendering.
 * No LLM call — purely aggregated from evidence and recommendations.
 *
 * Scope: read:dashboard
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildOnePager } from "@/lib/services/exports";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  const workspaceName = settings?.name ?? ctx.workspaceId;

  try {
    const onePager = await buildOnePager(ctx.workspaceId, workspaceName);
    return ok({ onePager });
  } catch (err) {
    const message = err instanceof Error ? err.message : "export_failed";
    return fail(message, 500);
  }
}
