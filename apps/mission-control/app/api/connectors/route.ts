/**
 * GET /api/connectors
 *
 * Returns all connector records for the authenticated workspace.
 * Used by the Connectors settings page to show install status.
 */

import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const connectors = await repository.listConnectors(ctx.workspaceId);

  return ok({
    workspaceId: ctx.workspaceId,
    connectors,
  });
}
