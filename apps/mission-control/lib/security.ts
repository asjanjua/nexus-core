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
export function isExplicitDevRuntime(): boolean {
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

/**
 * Derive a purpose-specific signing key from AUTH_SECRET.
 *
 * Everything that needed a signature used to HMAC with AUTH_SECRET directly,
 * which coupled unrelated lifetimes: rotating AUTH_SECRET to invalidate
 * sessions would also, silently, kill every outstanding unsubscribe link and
 * every in-flight connector OAuth state. Deriving per purpose does not remove
 * that coupling by itself — all subkeys still descend from AUTH_SECRET — but it
 * lets a single purpose be rotated on its own by bumping its label, e.g.
 * "unsubscribe-v1" to "unsubscribe-v2".
 *
 * HKDF with the label as `info` is the standard construction for this. The salt
 * is empty on purpose: AUTH_SECRET is already high-entropy, and a fixed salt
 * would have to be stored and rotated alongside it for no gain.
 */
export function derivedSigningKey(purpose: string, secret = requireAuthSecret()): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.alloc(0), Buffer.from(purpose, "utf8"), 32)
  );
}

/** HMAC-SHA256 under a purpose-derived subkey. See `derivedSigningKey`. */
export function signHmacHexFor(purpose: string, input: string): string {
  return crypto.createHmac("sha256", derivedSigningKey(purpose)).update(input).digest("hex");
}

/**
 * Whether a request carries the cron shared secret, via either
 * `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 *
 * Returns false when NEXUS_CRON_SECRET is unset so an unconfigured deployment
 * fails closed. Comparison is constant-time; this was previously five
 * copy-pasted `===` comparisons, one per cron route.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.NEXUS_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const header = request.headers.get("x-cron-secret") ?? "";
  return (
    timingSafeEqualString(auth, `Bearer ${secret}`) ||
    timingSafeEqualString(header, secret)
  );
}
