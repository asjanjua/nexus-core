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
import { listMessages, type ImapConnectionConfig } from "@/lib/connectors/imap";

function credsToConfig(creds: Record<string, unknown>): ImapConnectionConfig | null {
  const host = creds.host as string | undefined;
  const port = creds.port as number | undefined;
  const secure = creds.secure as boolean | undefined;
  const username = creds.username as string | undefined;
  const password = creds.password as string | undefined;
  if (!host || !port || !username || !password) return null;
  return { host, port, secure: secure ?? true, username, password };
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const mailbox = url.searchParams.get("mailbox") ?? "INBOX";
  const limit = Number(url.searchParams.get("limit") ?? "50") || 50;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "imap");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const creds = await repository.getConnectorCredentials(ctx.workspaceId, "imap");
  const config = creds ? credsToConfig(creds) : null;
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
