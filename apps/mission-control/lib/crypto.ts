/**
 * AES-256-GCM symmetric encryption for connector credentials.
 *
 * Used to encrypt OAuth tokens, API keys, and DB passwords before they
 * are written to the connectors table. The encryption key is derived
 * from AUTH_SECRET via PBKDF2 so a single environment secret covers both
 * session signing and credential storage.
 *
 * Zero external dependencies — built on Node.js crypto module.
 *
 * Format: base64url(iv[12] + ciphertext + authTag[16])
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const SALT = "nexus-connector-credentials-v1"; // static salt — key material comes from AUTH_SECRET

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "nexus-dev-secret";
  return crypto.pbkdf2Sync(secret, SALT, 100_000, 32, "sha256");
}

/**
 * Encrypt a plain-text string. Returns a base64url-encoded blob.
 * Safe to store in the database.
 */
export function encryptCredentials(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]).toString("base64url");
}

/**
 * Decrypt a blob produced by encryptCredentials().
 * Returns null if the blob is invalid or tampered.
 */
export function decryptCredentials(blob: string): string | null {
  try {
    const raw = Buffer.from(blob, "base64url");
    if (raw.length < IV_BYTES + TAG_BYTES + 1) return null;

    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(raw.length - TAG_BYTES);
    const ciphertext = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);

    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return null;
  }
}
