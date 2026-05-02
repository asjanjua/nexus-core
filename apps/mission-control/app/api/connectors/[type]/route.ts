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

const ALLOWED_TYPES = new Set(["slack", "google-drive", "sharepoint", "snowflake", "bigquery"]);

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
