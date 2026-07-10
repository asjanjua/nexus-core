/**
 * POST /api/connectors/imap/ingest
 *
 * Fetches a single message by UID from a mailbox folder, parses its MIME
 * source with mailparser, and pipes the plain-text body through the
 * existing ingestion pipeline.
 *
 * Request body:
 *   { mailbox?: string, uid: number, sensitivity?: string, department?: string }
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { getMessage, type ImapConnectionConfig } from "@/lib/connectors/imap";
import { z } from "zod";

const ingestBodySchema = z.object({
  mailbox: z.string().max(255).optional().default("INBOX"),
  uid: z.number().int().positive(),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("internal"),
  department: z.string().max(200).optional(),
});

function credsToConfig(creds: Record<string, unknown>): ImapConnectionConfig | null {
  const host = creds.host as string | undefined;
  const port = creds.port as number | undefined;
  const secure = creds.secure as boolean | undefined;
  const username = creds.username as string | undefined;
  const password = creds.password as string | undefined;
  if (!host || !port || !username || !password) return null;
  return { host, port, secure: secure ?? true, username, password };
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

  const { mailbox, uid, sensitivity, department } = parsed.data;

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

  let message;
  try {
    message = await getMessage(config, mailbox, uid);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "imap_fetch_failed";
    return fail(errMessage, 502);
  }

  const text = [
    `Subject: ${message.subject ?? "(no subject)"}`,
    `From: ${message.from ?? "unknown"}`,
    `To: ${message.to ?? "unknown"}`,
    `Date: ${message.date ?? ""}`,
    "",
    message.text,
  ].join("\n");

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");
  const sourceTimestamp = message.date ?? new Date().toISOString();

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "email_crm",
      department,
      connectorInstanceId,
      sourcePath: `imap://${mailbox}/${uid}`,
      sourceTimestamp,
      hash,
      sensitivity,
      extractionConfidence: 0.85,
      text,
    });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message2, 500);
  }

  return ok({ evidence, mailbox, uid });
}
