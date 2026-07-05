/**
 * GET /api/agents/catalog
 *
 * Read-only catalog of Nexus agents, skill families, and pivot-specific suites.
 * This lets human UI and external agent clients discover which skills can be
 * assigned before they create jobs or passport versions.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { buildAgentCatalog, validatePivotAgentCatalog } from "@/lib/agents/pivot-agent-catalog";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:settings");
  if (error) return error;

  const issues = validatePivotAgentCatalog();
  if (issues.length > 0) {
    return fail(
      `catalog_integrity_failure: ${issues.map((i) => `${i.suiteId}/${i.reason}`).join(", ")}`,
      500
    );
  }

  return ok({
    workspaceId: ctx.workspaceId,
    ...buildAgentCatalog(),
  });
}
