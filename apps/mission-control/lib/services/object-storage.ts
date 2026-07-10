import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

const R2_ENABLED = process.env.NEXUS_R2_ORIGINALS === "enabled";
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

type StoredOriginal = {
  key: string;
  sourceUri: string;
};

function r2Configured(): boolean {
  return Boolean(
    R2_ENABLED &&
      R2_BUCKET &&
      R2_ACCOUNT_ID &&
      R2_ACCESS_KEY_ID &&
      R2_SECRET_ACCESS_KEY
  );
}

let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!r2Configured()) return null;
  if (client) return client;

  client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!
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
      Bucket: R2_BUCKET,
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
    sourceUri: `r2://${R2_BUCKET}/${key}`
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
