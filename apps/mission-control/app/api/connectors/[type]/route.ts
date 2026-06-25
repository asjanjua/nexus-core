/**
 * DELETE /api/connectors/[type]
 *
 * Revokes a connector for the authenticated workspace.
 * Clears encrypted credentials and sets status to "revoked".
 * Idempotent — safe to call even if the connector is already revoked.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { sensitivitySchema } from "@/lib/contracts";
import { z } from "zod";

const ALLOWED_TYPES = new Set([
  "slack",
  "google-drive",
  "sharepoint",
  "snowflake",
  "bigquery",
  "private",
  "github",
  "jira",
  "hubspot",
  "quickbooks",
  "linkedin",
]);

const connectorPolicySchema = z.object({
  allowedChannels: z.array(z.string().min(1)).max(100).optional(),
  ingestAllPublicChannels: z.boolean().optional(),
  defaultSensitivity: sensitivitySchema.optional(),
  maxSensitivity: sensitivitySchema.optional(),
  sourcePolicy: z.enum(["read_only", "manual_review", "disabled"]).optional(),
  targetAgents: z.array(z.string().min(1)).max(40).optional(),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { type } = await params;
  if (!ALLOWED_TYPES.has(type)) return fail("unknown_connector_type", 400);

  const parsed = connectorPolicySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const connector = await repository.updateConnectorConfig(
    ctx.workspaceId,
    type,
    parsed.data,
    ctx.userId
  );
  if (!connector) return fail("connector_not_found", 404);

  return ok({ connector });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { type } = await params;
  if (!ALLOWED_TYPES.has(type)) return fail("unknown_connector_type", 400);

  await repository.revokeConnector(ctx.workspaceId, type);

  return ok({ workspaceId: ctx.workspaceId, type, revoked: true });
}
