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

const WORKSPACE_ID_PREFIX = "workspace-";

/**
 * Derive the tenant id that ingested evidence is filed under.
 *
 * This is a DATA-ISOLATION BOUNDARY, so it throws rather than guessing.
 *
 * It used to be `workspaceId.replace("workspace-", "tenant-")`. `String.replace`
 * with a string pattern replaces the first occurrence ANYWHERE, not a prefix,
 * so `acme-workspace-1` became `acme-tenant-1` and an id with no prefix at all
 * was passed through unchanged — silently filing one client's evidence under a
 * tenant derived from nothing. Three of five realistic id shapes were wrong.
 *
 * A throw here surfaces as a 500 on the ingest route, which is the correct
 * outcome: refusing to ingest is recoverable, mis-filing evidence across a
 * tenant boundary is not. If ids without the prefix ever become legitimate,
 * that must be an explicit, tested branch rather than an accident of `replace`.
 */
export function tenantIdForWorkspace(workspaceId: string): string {
  if (!workspaceId.startsWith(WORKSPACE_ID_PREFIX)) {
    throw new Error(
      `tenantIdForWorkspace: expected an id starting with "${WORKSPACE_ID_PREFIX}", got "${workspaceId}"`
    );
  }
  return `tenant-${workspaceId.slice(WORKSPACE_ID_PREFIX.length)}`;
}

export function evidenceHash(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("base64url");
}

/**
 * Largest provider download that will be pulled into memory.
 *
 * 50 MB comfortably covers the document types this ingests (policies, board
 * packs, statements) while bounding what a single malicious or misconfigured
 * source can cost. Previously unbounded: the reader accumulated chunks until
 * the process ran out of heap.
 */
export const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

export async function readStreamToBuffer(
  body: ReadableStream<Uint8Array>,
  maxBytes: number = MAX_DOWNLOAD_BYTES
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      // Checked as chunks arrive, not at the end: the point is to stop
      // consuming, so a cap that only fires after the whole body is resident
      // would protect nothing.
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error(`download exceeds ${maxBytes} bytes`);
      }
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
 * Share of U+FFFD replacement characters above which the bytes are treated as
 * binary. Legitimate text occasionally carries one from a mis-encoded source;
 * a binary file decoded as UTF-8 is saturated with them.
 */
const BINARY_REPLACEMENT_RATIO = 0.01;

/**
 * Decodes a downloaded file as UTF-8 text, falling back to base64 when the
 * bytes are not text.
 *
 * The previous implementation tested only for a NUL byte inside a try/catch:
 *
 *     try { const t = buffer.toString("utf-8"); return t.includes("\0") ? ... }
 *     catch { return buffer.toString("base64"); }
 *
 * Two defects. `Buffer.toString("utf-8")` never throws — invalid bytes become
 * U+FFFD — so the catch was dead code. And plenty of binary formats contain no
 * NUL byte at all: a JPEG header decoded that way returned five replacement
 * characters of mojibake, which was then hashed, embedded and surfaced as
 * citable evidence. Verified in docs/PR_REVIEW_2026-08-08.md §5.2.
 *
 * `contentType`, when the provider supplied one, is the stronger signal and is
 * consulted first. The ratio heuristic remains for providers that send nothing
 * useful.
 */
export function decodeDownloadedText(buffer: Buffer, contentType?: string): string {
  if (contentType && isBinaryContentType(contentType)) {
    return buffer.toString("base64");
  }

  const text = buffer.toString("utf-8");
  if (text.includes("\0")) return buffer.toString("base64");

  const replacements = (text.match(/�/g) ?? []).length;
  const looksBinary =
    replacements > 0 &&
    replacements > text.length * BINARY_REPLACEMENT_RATIO;

  return looksBinary ? buffer.toString("base64") : text;
}

/**
 * Whether a declared content type is known not to be UTF-8 text.
 *
 * Deliberately a denylist of binary families rather than an allowlist of text
 * ones: an unrecognised type falls through to the ratio heuristic, which is the
 * safer default than assuming binary and base64-encoding a readable document.
 */
function isBinaryContentType(contentType: string): boolean {
  const type = contentType.toLowerCase();
  if (type.startsWith("text/")) return false;
  if (type.includes("json") || type.includes("xml") || type.includes("csv")) return false;
  return (
    type.startsWith("image/") ||
    type.startsWith("audio/") ||
    type.startsWith("video/") ||
    type.startsWith("font/") ||
    type.includes("application/pdf") ||
    type.includes("application/zip") ||
    type.includes("application/octet-stream") ||
    type.includes("openxmlformats") ||
    type.includes("application/msword") ||
    type.includes("application/vnd.ms-")
  );
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
