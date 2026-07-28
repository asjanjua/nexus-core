/**
 * Ingestion helpers shared by connector ingest routes: request-body fields,
 * evidence hashing, binary download handling, and extraction-confidence
 * estimation.
 */

import crypto from "crypto";
import { z } from "zod";

export const SENSITIVITY_LEVELS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export type Sensitivity = (typeof SENSITIVITY_LEVELS)[number];

export function sensitivityField(defaultValue: Sensitivity = "internal") {
  return z.enum(SENSITIVITY_LEVELS).optional().default(defaultValue);
}

export const departmentField = z.string().max(200).optional();

export function tenantIdForWorkspace(workspaceId: string): string {
  return workspaceId.replace("workspace-", "tenant-");
}

export function evidenceHash(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("base64url");
}

export async function readStreamToBuffer(
  body: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(
    chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))
  );
}

/**
 * Decodes a downloaded file as UTF-8 text, falling back to base64 when the
 * bytes look binary.
 */
export function decodeDownloadedText(buffer: Buffer): string {
  try {
    const text = buffer.toString("utf-8");
    return text.includes("\0") ? buffer.toString("base64") : text;
  } catch {
    return buffer.toString("base64");
  }
}

export type ExtractionConfidenceProvider = "google-drive" | "sharepoint";

export function estimateExtractionConfidence(
  contentType: string,
  provider?: ExtractionConfidenceProvider
): number {
  if (
    contentType.includes("text/plain") ||
    contentType.includes("text/markdown")
  ) {
    return 0.95;
  }
  if (contentType.includes("application/vnd.google-apps.document")) return 0.9;
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("application/vnd.openxmlformats") ||
    contentType.includes("application/msword")
  ) {
    return 0.85;
  }
  // Preserve provider-specific approval behavior. SharePoint historically
  // auto-cleared legacy Office types; Drive kept them in human review.
  if (
    provider === "sharepoint" &&
    (contentType.includes("application/vnd.ms-excel") ||
      contentType.includes("application/vnd.ms-powerpoint"))
  ) {
    return 0.85;
  }
  return 0.6;
}
