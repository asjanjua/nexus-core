/**
 * GET /api/export/weekly-brief
 *
 * Returns the weekly executive brief as JSON for rendering in the print page,
 * or as a plain-text summary when ?format=text is passed.
 *
 * AI responsibility: LLM generates the brief narrative from approved evidence only.
 * Humans must review before sharing externally. This route never auto-sends.
 *
 * Scope: read:dashboard
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildWeeklyBrief } from "@/lib/services/exports";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  const workspaceName = settings?.name ?? ctx.workspaceId;

  try {
    const brief = await buildWeeklyBrief(ctx.workspaceId, workspaceName);
    return ok({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "export_failed";
    return fail(message, 500);
  }
}
