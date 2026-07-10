/**
 * GET /api/billing/plan — workspace plan summary for Settings UI.
 * Returns plan, token budget, resource limits, and feature flags.
 */
import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { getWorkspacePlanSummary } from "@/lib/billing/budget";

export async function GET(request: Request) {
  // allowWhenBlocked: a suspended/expired workspace must still be able to see
  // its own plan summary — that's how the user finds out why they're blocked.
  const { ctx, error } = await requireScope(request, "read:workspace", { allowWhenBlocked: true });
  if (error) return error;

  const summary = await getWorkspacePlanSummary(ctx.workspaceId);
  return ok(summary);
}
