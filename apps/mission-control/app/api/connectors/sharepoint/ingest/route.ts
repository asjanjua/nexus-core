/**
 * POST /api/connectors/sharepoint/ingest
 *
 * Downloads a file from SharePoint / OneDrive by drive item ID via
 * Microsoft Graph and pipes it through the existing ingestion pipeline.
 *
 * Request body:
 *   { fileId: string, sensitivity?: string, department?: string }
 *
 * The file content is downloaded, hashed, and ingested as a document
 * evidence record. Confidence is estimated based on the file type.
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  downloadFile,
  refreshAccessToken,
} from "@/lib/connectors/sharepoint";
import { z } from "zod";

const ingestBodySchema = z.object({
  fileId: z.string().min(1),
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

  const { fileId, sensitivity, department } = parsed.data;

  // Check connector is active
  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "sharepoint");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(
    ctx.workspaceId,
    "sharepoint"
  );
  if (!accessToken) {
    return fail("sharepoint_auth_expired", 401);
  }

  // Download the file
  let download;
  try {
    download = await downloadFile(accessToken, fileId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "download_failed";
    return fail(message, 502);
  }

  if (!download.body) {
    return fail("file_body_empty", 502);
  }

  // Read full body into buffer
  const chunks: Uint8Array[] = [];
  const reader = download.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const buffer = Buffer.concat(
    chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))
  );

  // Compute hash for provenance
  const hash = crypto.createHash("sha256").update(buffer).digest("base64url");

  // Try to read as text — fall back to base64 for binary files
  let text: string;
  try {
    text = buffer.toString("utf-8");
    // Quick binary check — if it contains null bytes, encode as base64
    if (text.includes("\0")) {
      text = buffer.toString("base64");
    }
  } catch {
    text = buffer.toString("base64");
  }

  // Estimate confidence based on file type
  const contentType = download.contentType;
  let extractionConfidence = 0.6; // default for unknown
  if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
    extractionConfidence = 0.95;
  } else if (contentType.includes("application/pdf")) {
    extractionConfidence = 0.85;
  } else if (
    contentType.includes("application/vnd.openxmlformats") ||
    contentType.includes("application/msword") ||
    contentType.includes("application/vnd.ms-excel") ||
    contentType.includes("application/vnd.ms-powerpoint")
  ) {
    extractionConfidence = 0.85;
  }

  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");

  // Ingest via the pipeline
  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "document",
      department,
      connectorInstanceId,
      sourcePath: `sharepoint://${fileId}`,
      sourceUri: `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      sourceTimestamp: new Date().toISOString(),
      hash,
      sensitivity,
      extractionConfidence,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({
    evidence,
    fileId,
    bytesIngested: totalLength,
    contentType: download.contentType,
  });
}
