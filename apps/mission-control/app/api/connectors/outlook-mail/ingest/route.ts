/**
 * POST /api/connectors/outlook-mail/ingest
 *
 * Fetches a single Outlook message by ID and pipes it through the
 * existing ingestion pipeline as text — emails are read as plain text
 * bodies plus key headers, not binary downloads.
 *
 * Request body:
 *   { messageId: string, sensitivity?: string, department?: string }
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  departmentField,
  evidenceHash,
  sensitivityField,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";
import {
  getMessage,
  extractPlainTextBody,
  refreshAccessToken,
} from "@/lib/connectors/outlook-mail";
import { z } from "zod";

const ingestBodySchema = z.object({
  messageId: z.string().min(1),
  sensitivity: sensitivityField("internal"),
  department: departmentField,
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const parsed = ingestBodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return fail(parsed.error.message, 400);
  }

  const { messageId, sensitivity, department } = parsed.data;

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

  let message;
  try {
    message = await getMessage(accessToken, messageId);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "fetch_failed";
    return fail(errMessage, 502);
  }

  const from = message.from?.emailAddress?.address ?? "unknown";
  const to = (message.toRecipients ?? [])
    .map((r) => r.emailAddress?.address)
    .filter(Boolean)
    .join(", ") || "unknown";
  const subject = message.subject ?? "(no subject)";
  const date = message.receivedDateTime ?? "";
  const body = extractPlainTextBody(message.body);

  const text = [
    `Subject: ${subject}`,
    `From: ${from}`,
    `To: ${to}`,
    `Date: ${date}`,
    "",
    body,
  ].join("\n");

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);
  const sourceTimestamp = message.receivedDateTime ?? new Date().toISOString();

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "email_crm",
      department,
      connectorInstanceId,
      sourcePath: `outlook-mail://${message.id}`,
      sourceUri: message.webLink,
      sourceTimestamp,
      hash,
      sensitivity,
      extractionConfidence: 0.9,
      text,
    });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message2, 500);
  }

  return ok({ evidence, messageId: message.id });
}
