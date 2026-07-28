/**
 * GET /api/connectors/outlook-mail/files
 *
 * Lists messages from the workspace's connected Outlook mailbox.
 * Named "files" to match the shared connector route convention even
 * though Outlook returns messages, not files.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   pageToken — pagination token (full @odata.nextLink URL) for next page
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import {
  listMessages,
  refreshAccessToken,
} from "@/lib/connectors/outlook-mail";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const pageToken = url.searchParams.get("pageToken") ?? undefined;

  const connector = await getActiveConnector(ctx.workspaceId, "outlook-mail");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "outlook-mail",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("outlook_mail_auth_expired", 401);
  }

  try {
    const messageList = await listMessages(accessToken, pageToken);
    return ok(messageList);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
