import crypto from "crypto";

const DEV_SECRET = "nexus-dev-secret";

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (!isProductionRuntime()) return DEV_SECRET;
  throw new Error("AUTH_SECRET is required in production");
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
