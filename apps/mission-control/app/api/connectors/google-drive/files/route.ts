/**
 * GET /api/connectors/google-drive/files
 *
 * Lists files from the workspace's connected Google Drive.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   pageToken — pagination token for next page of results
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import {
  listFiles as listDriveFiles,
  refreshAccessToken,
} from "@/lib/connectors/google-drive";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const pageToken = url.searchParams.get("pageToken") ?? undefined;

  // Get the connector record to check status
  const connector = await getActiveConnector(ctx.workspaceId, "google-drive");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "google-drive",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("google_drive_auth_expired", 401);
  }

  try {
    const fileList = await listDriveFiles(accessToken, pageToken);
    return ok(fileList);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
