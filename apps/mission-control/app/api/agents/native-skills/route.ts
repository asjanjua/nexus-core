/**
 * GET /api/agents/native-skills
 *
 * Read-only catalog of first-party Nexus skills, their workflow coverage,
 * pivot coverage, approval gates, and audit requirements.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  buildNexusNativeSkillCatalog,
  validateNexusNativeSkills,
} from "@/lib/agents/nexus-native-skills";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:settings");
  if (error) return error;

  const issues = validateNexusNativeSkills();
  if (issues.length > 0) {
    return fail(
      `native_skill_integrity_failure: ${issues.map((issue) => issue.reason).join(", ")}`,
      500
    );
  }

  return ok({
    workspaceId: ctx.workspaceId,
    ...buildNexusNativeSkillCatalog(),
  });
}
