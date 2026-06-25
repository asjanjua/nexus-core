/**
 * GET  /api/strategy-profile — retrieve current strategy profile
 * PATCH /api/strategy-profile — upsert strategy profile fields
 *
 * Connected to public /readiness assessment and post-signup onboarding routing.
 */
import { fail, ok } from "@/lib/api";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";
import { strategyProfileInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const profile = await repository.getStrategyProfile(workspaceId);
  return ok(profile ?? null);
}

export async function PATCH(request: Request) {
  const auth = await resolveAuth(request);
  const body = await request.json().catch(() => null);
  const parsed = strategyProfileInputSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const workspaceId = body?.workspaceId ?? auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const profile = await repository.upsertStrategyProfile(workspaceId, parsed.data);
  return ok(profile);
}
