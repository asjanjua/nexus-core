/**
 * Agent Control Profiles (passports)
 *
 * GET  /api/agent-control-profiles       -> list all profiles
 * POST /api/agent-control-profiles       -> create a new profile version
 * POST /api/agent-control-profiles?seed=1 -> seed default profiles from agent library
 */

import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { agentControlProfileInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const url = new URL(request.url);
  const agentKey = url.searchParams.get("agentKey");

  if (agentKey) {
    const profiles = await repository.getAgentControlProfileHistory(ctx.workspaceId, agentKey);
    return ok({ workspaceId: ctx.workspaceId, agentKey, profiles });
  }

  const profiles = await repository.listAgentControlProfiles(ctx.workspaceId);
  return ok({ workspaceId: ctx.workspaceId, profiles });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const url = new URL(request.url);
  if (url.searchParams.get("seed") === "1") {
    const profiles = await repository.seedDefaultAgentControlProfiles(ctx.workspaceId, ctx.userId);
    return ok({ workspaceId: ctx.workspaceId, seeded: profiles.length, profiles }, 201);
  }

  const body = await request.json().catch(() => null);
  const parsed = agentControlProfileInputSchema.safeParse({
    ...body,
    workspaceId: ctx.workspaceId,
    createdBy: ctx.userId,
    updatedBy: ctx.userId
  });
  if (!parsed.success) return fail("invalid_request", 400);

  const profile = await repository.createAgentControlProfileVersion(parsed.data);
  return ok(profile, 201);
}

