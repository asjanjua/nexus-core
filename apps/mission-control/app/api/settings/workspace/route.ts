/**
 * Workspace settings API
 * GET  /api/settings/workspace?workspaceId=...
 * PATCH /api/settings/workspace
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { sensitivitySchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";

const patchSchema = z.object({
  // workspaceId in body is optional — falls back to session/token workspace
  workspaceId: z.string().optional(),
  name: z.string().min(2).max(200).optional(),
  timezone: z.string().optional(),
  llmProvider: z.enum(["anthropic", "openai", "azure_openai"]).optional(),
  llmModel: z.string().optional(),
  quarantineThreshold: z.number().min(0).max(1).optional(),
  defaultSensitivity: sensitivitySchema.optional(),
  slackEnabled: z.boolean().optional(),
  teamsEnabled: z.boolean().optional()
});

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  const url = new URL(request.url);
  // Query param override for multi-tenant admin tools; session/token workspace otherwise
  const workspaceId =
    url.searchParams.get("workspaceId") ?? auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const settings = await repository.getWorkspaceSettings(workspaceId);
  return ok(settings);
}

export async function PATCH(request: Request) {
  const auth = await resolveAuth(request);
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const { workspaceId: bodyWorkspaceId, ...patch } = parsed.data;
  const workspaceId = bodyWorkspaceId ?? auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const updated = await repository.updateWorkspaceSettings(workspaceId, patch);
  return ok(updated);
}
