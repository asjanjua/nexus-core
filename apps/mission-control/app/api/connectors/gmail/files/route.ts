/**
 * GET /api/connectors/gmail/files
 *
 * Lists message IDs from the workspace's connected Gmail mailbox.
 * Named "files" to match the shared connector route convention even
 * though Gmail returns messages, not files.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   q         — Gmail search query (e.g. "in:inbox newer_than:30d")
 *   pageToken — pagination token for next page of results
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { listMessages, refreshAccessToken } from "@/lib/connectors/gmail";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const pageToken = url.searchParams.get("pageToken") ?? undefined;

  const connector = await getActiveConnector(ctx.workspaceId, "gmail");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "gmail",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("gmail_auth_expired", 401);
  }

  try {
    const messageList = await listMessages(accessToken, q, pageToken);
    return ok(messageList);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
