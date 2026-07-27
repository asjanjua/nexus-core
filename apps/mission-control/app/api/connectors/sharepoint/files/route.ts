/**
 * GET /api/connectors/sharepoint/files
 *
 * Lists files from the workspace's connected SharePoint / OneDrive
 * document library via Microsoft Graph.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   pageToken — full @odata.nextLink URL for the next page of results
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import {
  listFiles as listSharePointFiles,
  refreshAccessToken,
} from "@/lib/connectors/sharepoint";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const pageToken = url.searchParams.get("pageToken") ?? undefined;

  // Get the connector record to check status
  const connector = await getActiveConnector(ctx.workspaceId, "sharepoint");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "sharepoint",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("sharepoint_auth_expired", 401);
  }

  try {
    const fileList = await listSharePointFiles(accessToken, pageToken);
    return ok(fileList);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
