/**
 * Agent key management - list and create
 * POST /api/agent-keys  -> create key (returns secret once)
 * GET  /api/agent-keys  -> list keys (no secrets)
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { agentScopeSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  scopes: z.array(agentScopeSchema).min(1),
  expiresAt: z.string().optional()
});

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const keys = await repository.listAgentKeys(ctx.workspaceId);
  return ok(keys);
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const created = await repository.createAgentKey({
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    scopes: parsed.data.scopes,
    expiresAt: parsed.data.expiresAt
  });

  return ok(created, 201);
}
