import crypto from "crypto";

const DEV_SECRET = "nexus-dev-secret";

/**
 * Contexts where falling back to the shared development secret is acceptable.
 *
 * Deliberately an allowlist, not `!isProductionRuntime()`. NODE_ENV being
 * unset is the dangerous case — a process started outside `next start` (a
 * migration script, a worker, a container entrypoint) would otherwise sign
 * bearer tokens and derive the connector-credential key from a value published
 * in this repo. Fail closed there instead.
 */
function isExplicitDevRuntime(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (isExplicitDevRuntime()) return DEV_SECRET;
  throw new Error(
    "AUTH_SECRET is required unless NODE_ENV is explicitly development or test"
  );
}

export function timingSafeEqualString(left: string, right: string, encoding: BufferEncoding = "utf8"): boolean {
  const leftBuffer = Buffer.from(left, encoding);
  const rightBuffer = Buffer.from(right, encoding);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signHmacHex(input: string, secret = requireAuthSecret()): string {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}
