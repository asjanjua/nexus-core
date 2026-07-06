/**
 * Workspace settings API
 * GET  /api/settings/workspace
 * PATCH /api/settings/workspace
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { sensitivitySchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  timezone: z.string().optional(),
  llmProvider: z.enum(["anthropic", "openai", "azure_openai", "deepseek", "openai_compatible"]).optional(),
  llmModel: z.string().optional(),
  quarantineThreshold: z.number().min(0).max(1).optional(),
  defaultSensitivity: sensitivitySchema.optional(),
  slackEnabled: z.boolean().optional(),
  teamsEnabled: z.boolean().optional(),
  allowedProviders: z.array(z.enum(["anthropic", "openai", "azure_openai", "deepseek", "openai_compatible", "local"])).optional(),
  localOnlyMode: z.boolean().optional(),
  sensitivityCeiling: sensitivitySchema.optional(),
  approvalRequiredThreshold: z.number().min(0).max(1).optional(),
  demoMode: z.boolean().optional()
});

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:settings");
  if (error) return error;
  // Authz: always the caller's own workspace. A caller-supplied workspaceId
  // must never widen access to another workspace's settings.
  const workspaceId = ctx.workspaceId;
  const settings = await repository.getWorkspaceSettings(workspaceId);
  return ok(settings);
}

export async function PATCH(request: Request) {
  const { ctx, error } = await requireScope(request, "write:settings");
  if (error) return error;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // Authz: same rule as GET — write only to the caller's own workspace.
  const workspaceId = ctx.workspaceId;
  const updated = await repository.updateWorkspaceSettings(workspaceId, parsed.data);
  return ok(updated);
}
