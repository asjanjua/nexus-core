/**
 * GET  /api/workspace/profile — fetch the current workspace's company profile
 * POST /api/workspace/profile — upsert the company profile for the current workspace
 *
 * Called by:
 *   - Onboarding wizard on step 3 completion (POST)
 *   - Settings page profile tab (GET + POST)
 *   - LLM services on demand (GET)
 *
 * The profile is used to inject business context into dashboard synthesis,
 * ask queries, and recommendation generation prompts.
 */

import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { workspaceProfileUpsertSchema } from "@/lib/contracts";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const profile = await repository.getWorkspaceProfile(ctx.workspaceId);
  return ok(profile ?? null);
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = workspaceProfileUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return fail(`invalid_request: ${parsed.error.issues.map((i) => i.message).join(", ")}`, 400);
  }

  const saved = await repository.saveWorkspaceProfile({
    ...parsed.data,
    workspaceId: ctx.workspaceId,
    primaryGoals: parsed.data.primaryGoals ?? [],
    priorityRoles: parsed.data.priorityRoles ?? [],
    briefLanguageMode: parsed.data.briefLanguageMode ?? "formal",
    locationCount: parsed.data.locationCount ?? 1,
    roleStates: parsed.data.roleStates ?? {},
    updatedAt: new Date().toISOString()
  });

  return ok(saved);
}
