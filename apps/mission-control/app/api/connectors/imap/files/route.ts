/**
 * GET /api/connectors/imap/files
 *
 * Lists recent messages in a mailbox folder on the workspace's connected
 * IMAP account. Named "files" to match the shared connector route
 * convention even though IMAP returns messages, not files.
 *
 * Query params:
 *   mailbox — folder path, defaults to "INBOX"
 *   limit   — max messages to return, defaults to 50
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { getActiveConnector } from "@/lib/connectors/shared/access-token";
import { credentialsToImapConfig, listMessages } from "@/lib/connectors/imap";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const mailbox = url.searchParams.get("mailbox") ?? "INBOX";
  const limit = Number(url.searchParams.get("limit") ?? "50") || 50;

  const connector = await getActiveConnector(ctx.workspaceId, "imap");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const creds = await repository.getConnectorCredentials(ctx.workspaceId, "imap");
  const config = creds ? credentialsToImapConfig(creds) : null;
  if (!config) {
    return fail("imap_credentials_missing", 401);
  }

  try {
    const result = await listMessages(config, mailbox, Math.min(limit, 200));
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "imap_list_failed";
    return fail(message, 502);
  }
}
