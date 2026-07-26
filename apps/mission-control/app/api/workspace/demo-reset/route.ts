/**
 * POST /api/workspace/demo-reset
 *
 * Admin action that clears all evidence, recommendations, and decisions from the
 * workspace and re-seeds it with a realistic sector demo pack.
 *
 * Only works when demo_mode is enabled on the workspace. This prevents accidental
 * use on a real client workspace.
 *
 * Query params:
 *   sector — one of: financial_services | professional_services | technology_saas
 *
 * Scope: admin
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { isDemoPackSector, seedSectorPack } from "@/lib/demo/seed-sector-pack";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  if (!settings?.demoMode) {
    return fail("demo_mode_required: enable demo mode in Settings before resetting the demo workspace", 403);
  }

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector") ?? "technology_saas";
  if (!isDemoPackSector(sector)) {
    return fail("invalid_sector: must be financial_services, professional_services, or technology_saas", 400);
  }
  const seeded = await seedSectorPack({ workspaceId: ctx.workspaceId, actor: ctx.userId, sector, replace: true });

  return ok({
    reset: true,
    ...seeded,
    message: `Demo workspace reset to ${seeded.workspaceName} (${sector}). Dashboard cards will populate within a few seconds.`,
  });
}
