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

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { getActiveConnector } from "@/lib/connectors/shared/access-token";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  departmentField,
  evidenceHash,
  sensitivityField,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";
import { credentialsToImapConfig, getMessage } from "@/lib/connectors/imap";
import { z } from "zod";

const ingestBodySchema = z.object({
  mailbox: z.string().max(255).optional().default("INBOX"),
  uid: z.number().int().positive(),
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

  const { mailbox, uid, sensitivity, department } = parsed.data;

  const connector = await getActiveConnector(ctx.workspaceId, "imap");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const creds = await repository.getConnectorCredentials(ctx.workspaceId, "imap");
  const config = creds ? credentialsToImapConfig(creds) : null;
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

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);
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
