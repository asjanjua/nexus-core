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

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  decodeDownloadedText,
  departmentField,
  estimateExtractionConfidence,
  evidenceHash,
  readStreamToBuffer,
  sensitivityField,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";
import {
  downloadFile,
  refreshAccessToken,
} from "@/lib/connectors/sharepoint";
import { z } from "zod";

const ingestBodySchema = z.object({
  fileId: z.string().min(1),
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

  const { fileId, sensitivity, department } = parsed.data;

  // Check connector is active
  const connector = await getActiveConnector(ctx.workspaceId, "sharepoint");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "sharepoint",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
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

  const buffer = await readStreamToBuffer(download.body);

  // Compute hash for provenance
  const hash = evidenceHash(buffer);

  const text = decodeDownloadedText(buffer);

  const extractionConfidence = estimateExtractionConfidence(
    download.contentType,
    "sharepoint"
  );

  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);

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
    bytesIngested: buffer.length,
    contentType: download.contentType,
  });
}
