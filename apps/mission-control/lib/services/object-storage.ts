import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

/**
 * Config is read at CALL time, not captured into module-level constants at
 * import time.
 *
 * The old version froze these at first import. That made the module untestable
 * without cache-busting tricks, and it is part of why the 2026-08-08 misconfig
 * was so hard to see: nothing could re-evaluate the config to report on it.
 * Reading on demand costs a property lookup and makes the state observable.
 */
function cfg() {
  return {
    enabled: process.env.NEXUS_R2_ORIGINALS === "enabled",
    bucket: process.env.R2_BUCKET?.trim() ?? "",
    accountId: process.env.R2_ACCOUNT_ID?.trim() ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? ""
  };
}

type StoredOriginal = {
  key: string;
  sourceUri: string;
};

/**
 * A Cloudflare account id is 32 lowercase hex characters. Anything else cannot
 * produce a resolvable endpoint, so treating it as "configured" is a lie.
 */
const R2_ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * Bucket names are DNS labels: lowercase alphanumerics and hyphens, 3-63 chars,
 * not starting or ending with a hyphen.
 */
const R2_BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/**
 * A value that is present but structurally impossible — the failure this
 * function exists to catch.
 *
 * Found in production 2026-08-08: R2_ACCOUNT_ID and R2_BUCKET were both set to
 * the literal two characters `""`. Someone had filled the required fields with
 * empty-looking placeholders. `Boolean('""')` is TRUE, so the old presence-only
 * check passed, isOriginalStorageEnabled() returned true, and /api/health
 * reported originals storage green — while the S3 client built an endpoint of
 * `https://"".r2.cloudflarestorage.com`, which cannot resolve.
 *
 * Every upload therefore threw, was caught by the ingestion route, recorded as
 * `ingestion_original_storage_failed` in the audit log, and ingestion continued
 * without retaining the original. Evidence provenance was silently off for the
 * entire life of the deployment and no surface said so.
 *
 * Presence is not configuration. Validate the shape.
 */
export type R2ConfigProblem =
  | "disabled"
  | "missing_account_id"
  | "malformed_account_id"
  | "missing_bucket"
  | "malformed_bucket"
  | "missing_access_key_id"
  | "missing_secret_access_key";

/** Null when usable; otherwise the first structural problem found. */
export function r2ConfigProblem(): R2ConfigProblem | null {
  const c = cfg();
  if (!c.enabled) return "disabled";
  if (!c.accountId) return "missing_account_id";
  if (!R2_ACCOUNT_ID_PATTERN.test(c.accountId)) return "malformed_account_id";
  if (!c.bucket) return "missing_bucket";
  if (!R2_BUCKET_PATTERN.test(c.bucket)) return "malformed_bucket";
  // Key material is opaque, so shape cannot be asserted beyond non-emptiness.
  // Quote characters are checked because that is how this bug arrived, and a
  // credential containing a quote is a paste error every time.
  if (!c.accessKeyId || c.accessKeyId.includes('"')) return "missing_access_key_id";
  if (!c.secretAccessKey || c.secretAccessKey.includes('"')) return "missing_secret_access_key";
  return null;
}

function r2Configured(): boolean {
  return r2ConfigProblem() === null;
}

let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!r2Configured()) return null;
  if (client) return client;

  // Trimmed, because r2ConfigProblem() validates the TRIMMED value. Building
  // the endpoint from the raw one would let a trailing newline — what you get
  // pasting into a dashboard field — pass validation and still produce an
  // unresolvable host.
  client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg().accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg().accessKeyId,
      secretAccessKey: cfg().secretAccessKey
    }
  });

  return client;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function buildKey(workspaceId: string, hash: string, fileName: string): string {
  const hashPart = hash.replace(/^sha256:/, "").slice(0, 16);
  const stamp = new Date().toISOString().slice(0, 10);
  return `workspace/${workspaceId}/originals/${stamp}/${hashPart}-${sanitizeFileName(fileName)}`;
}

export function isOriginalStorageEnabled(): boolean {
  return r2Configured();
}

export async function storeOriginalFile(input: {
  workspaceId: string;
  fileName: string;
  contentType?: string;
  hash: string;
  buffer: Buffer;
}): Promise<StoredOriginal | null> {
  const s3 = getClient();
  if (!s3) return null;

  const key = buildKey(input.workspaceId, input.hash, input.fileName);

  await s3.send(
    new PutObjectCommand({
      Bucket: cfg().bucket,
      Key: key,
      Body: input.buffer,
      ContentType:
        input.contentType || "application/octet-stream",
      Metadata: {
        workspace_id: input.workspaceId,
        source_hash: input.hash
      }
    })
  );

  return {
    key,
    sourceUri: `r2://${cfg().bucket}/${key}`
  };
}

export function parseR2SourceUri(sourceUri: string): { bucket: string; key: string } | null {
  if (!sourceUri.startsWith("r2://")) return null;
  const remainder = sourceUri.slice("r2://".length);
  const slashIndex = remainder.indexOf("/");
  if (slashIndex <= 0) return null;
  return {
    bucket: remainder.slice(0, slashIndex),
    key: remainder.slice(slashIndex + 1)
  };
}

export async function fetchOriginalFile(sourceUri: string): Promise<{
  body: ReadableStream;
  contentType: string;
  fileName: string;
} | null> {
  const parsed = parseR2SourceUri(sourceUri);
  const s3 = getClient();
  if (!parsed || !s3) return null;

  const result = await s3.send(
    new GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key
    })
  );

  if (!result.Body) return null;

  const fileName = parsed.key.split("/").pop() ?? "original";
  return {
    body: result.Body.transformToWebStream() as ReadableStream,
    contentType: result.ContentType ?? "application/octet-stream",
    fileName
  };
}

/**
 * Does the bucket actually exist and answer to these credentials?
 *
 * r2ConfigProblem() proves the config is well FORMED. It cannot prove the
 * bucket exists, that the token is valid, or that the token is scoped to this
 * bucket. On 2026-08-08 the deployment had no bucket at all while every
 * config-shaped check reported healthy.
 *
 * Deliberately NOT called from /api/health. That route is public,
 * unauthenticated and used as Render's healthCheckPath, so a network round trip
 * to Cloudflare on every hit would add latency to deploys and burn Class B
 * operations for anyone who curls it. This belongs on the admin surface, which
 * is platform-admin gated and consulted rarely.
 *
 * Returns a discriminated result rather than throwing: a reachability probe
 * that can take down the page calling it is not a diagnostic.
 */
export async function probeOriginalStorage(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const problem = r2ConfigProblem();
  if (problem) return { ok: false, reason: problem };

  const s3 = getClient();
  if (!s3) return { ok: false, reason: "client_unavailable" };

  try {
    await s3.send(new HeadBucketCommand({ Bucket: cfg().bucket }));
    return { ok: true };
  } catch (error) {
    const name =
      error instanceof Error ? (error.name || "unknown_error") : "unknown_error";
    // NotFound = bucket missing. Forbidden = token wrong or wrongly scoped.
    // Both must be distinguishable; "storage is broken" is not actionable.
    return { ok: false, reason: name };
  }
}
