/**
 * GET /api/agents/workflow-analysis
 *
 * Read-only workflow-by-workflow map of where Nexus uses each agent skill.
 */

import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { buildWorkflowSkillAnalysis } from "@/lib/agents/workflow-skill-analysis";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:settings");
  if (error) return error;

  return ok({
    workspaceId: ctx.workspaceId,
    ...buildWorkflowSkillAnalysis(),
  });
}
