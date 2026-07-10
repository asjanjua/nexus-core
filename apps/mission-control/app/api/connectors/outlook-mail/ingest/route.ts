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

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  getMessage,
  extractPlainTextBody,
  refreshAccessToken,
} from "@/lib/connectors/outlook-mail";
import { z } from "zod";

const ingestBodySchema = z.object({
  messageId: z.string().min(1),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("internal"),
  department: z.string().max(200).optional(),
});

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<string | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;

  if (!accessToken) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return accessToken;
    }
  }

  if (refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      await repository.upsertConnector({
        workspaceId,
        type,
        installedBy: "token-refresh",
        credentials: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token ?? refreshToken,
          scope: newTokens.scope,
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
        },
      });
      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  return accessToken;
}

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

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "outlook-mail");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(ctx.workspaceId, "outlook-mail");
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

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");
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
