/**
 * GET /api/billing/plan — workspace plan summary for Settings UI.
 * Returns plan, token budget, resource limits, and feature flags.
 */
import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { getWorkspacePlanSummary } from "@/lib/billing/budget";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  const summary = await getWorkspacePlanSummary(ctx.workspaceId);
  return ok(summary);
}
