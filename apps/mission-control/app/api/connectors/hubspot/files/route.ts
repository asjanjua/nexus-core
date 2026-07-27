/**
 * GET /api/connectors/hubspot/files
 *
 * Lists deals from the workspace's connected HubSpot CRM account.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   after — pagination cursor
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { listDeals, refreshAccessToken } from "@/lib/connectors/hubspot";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const after = url.searchParams.get("after") ?? undefined;

  const connector = await getActiveConnector(ctx.workspaceId, "hubspot");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "hubspot",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("hubspot_auth_expired", 401);
  }

  try {
    const deals = await listDeals(accessToken, after);
    return ok(deals);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
