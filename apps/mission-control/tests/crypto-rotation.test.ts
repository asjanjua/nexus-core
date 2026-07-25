/**
 * Credential key versioning and rotation.
 *
 * Before this, the credential key was derived from AUTH_SECRET with no version
 * marker and no rotation path, so regenerating AUTH_SECRET made every stored
 * connector credential permanently undecryptable.
 *
 * Uses vi.resetModules() per case because lib/crypto.ts memoises derived keys.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const AUTH = "auth-secret-for-rotation-tests-0000000000";
const CRED_A = "credentials-secret-a-000000000000000000";
const CRED_B = "credentials-secret-b-111111111111111111";

function clearEnv() {
  process.env.AUTH_SECRET = AUTH;
  delete process.env.NEXUS_CREDENTIALS_SECRET;
  delete process.env.NEXUS_CREDENTIALS_SECRET_PREVIOUS;
}

async function freshCrypto() {
  vi.resetModules();
  return import("@/lib/crypto");
}

beforeEach(() => {
  clearEnv();
});

afterEach(() => {
  clearEnv();
});

describe("credential encryption versioning", () => {
  it("writes version-prefixed blobs", async () => {
    const { encryptCredentials } = await freshCrypto();
    expect(encryptCredentials("secret")).toMatch(/^v2\./);
  });

  it("round-trips under the current key", async () => {
    const { encryptCredentials, decryptCredentials } = await freshCrypto();
    const blob = encryptCredentials("oauth-token");
    expect(decryptCredentials(blob)).toBe("oauth-token");
  });

  it("still decrypts legacy unversioned v1 blobs", async () => {
    // Reproduce the pre-change format exactly: AES-256-GCM under a key derived
    // from AUTH_SECRET with the v1 salt, no version prefix.
    const crypto = await import("crypto");
    const key = crypto.pbkdf2Sync(AUTH, "nexus-connector-credentials-v1", 100_000, 32, "sha256");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const body = Buffer.concat([cipher.update("legacy-credential", "utf8"), cipher.final()]);
    const legacyBlob = Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");

    const { decryptCredentials } = await freshCrypto();
    expect(decryptCredentials(legacyBlob)).toBe("legacy-credential");
  });

  it("returns null for a tampered blob", async () => {
    const { encryptCredentials, decryptCredentials } = await freshCrypto();
    const blob = encryptCredentials("sensitive");
    const chars = blob.split("");
    const mid = Math.floor(chars.length / 2);
    chars[mid] = chars[mid] === "A" ? "B" : "A";
    expect(decryptCredentials(chars.join(""))).toBeNull();
  });
});

describe("credential key rotation", () => {
  it("reads blobs written under the previous secret during rotation", async () => {
    process.env.NEXUS_CREDENTIALS_SECRET = CRED_A;
    const before = await freshCrypto();
    const blob = before.encryptCredentials("token-under-a");

    // Rotate: A becomes previous, B becomes current.
    process.env.NEXUS_CREDENTIALS_SECRET = CRED_B;
    process.env.NEXUS_CREDENTIALS_SECRET_PREVIOUS = CRED_A;
    const after = await freshCrypto();

    expect(after.decryptCredentials(blob)).toBe("token-under-a");
  });

  it("cannot read an old blob once the previous secret is removed", async () => {
    process.env.NEXUS_CREDENTIALS_SECRET = CRED_A;
    const before = await freshCrypto();
    const blob = before.encryptCredentials("token-under-a");

    process.env.NEXUS_CREDENTIALS_SECRET = CRED_B;
    delete process.env.NEXUS_CREDENTIALS_SECRET_PREVIOUS;
    const after = await freshCrypto();

    expect(after.decryptCredentials(blob)).toBeNull();
  });

  it("flags blobs that still carry old key material, and clears once rewritten", async () => {
    process.env.NEXUS_CREDENTIALS_SECRET = CRED_A;
    const before = await freshCrypto();
    const blob = before.encryptCredentials("token-under-a");

    process.env.NEXUS_CREDENTIALS_SECRET = CRED_B;
    process.env.NEXUS_CREDENTIALS_SECRET_PREVIOUS = CRED_A;
    const after = await freshCrypto();

    expect(after.needsReencryption(blob)).toBe(true);

    const rewritten = after.reencryptCredentials(blob);
    expect(rewritten).not.toBeNull();
    expect(after.needsReencryption(rewritten!)).toBe(false);
    expect(after.decryptCredentials(rewritten!)).toBe("token-under-a");
  });

  it("treats a legacy v1 blob as needing re-encryption", async () => {
    const { encryptCredentials, needsReencryption } = await freshCrypto();
    const current = encryptCredentials("x");
    expect(needsReencryption(current)).toBe(false);
    // Strip the version prefix to simulate a stored v1 blob.
    expect(needsReencryption(current.replace(/^v2\./, ""))).toBe(true);
  });

  it("returns null from reencryptCredentials when no key can read the blob", async () => {
    process.env.NEXUS_CREDENTIALS_SECRET = CRED_A;
    const before = await freshCrypto();
    const blob = before.encryptCredentials("unreadable-after-rotation");

    process.env.NEXUS_CREDENTIALS_SECRET = CRED_B;
    delete process.env.NEXUS_CREDENTIALS_SECRET_PREVIOUS;
    const after = await freshCrypto();

    expect(after.reencryptCredentials(blob)).toBeNull();
  });

  it("falls back to AUTH_SECRET when no credentials secret is configured", async () => {
    delete process.env.NEXUS_CREDENTIALS_SECRET;
    const { encryptCredentials, decryptCredentials } = await freshCrypto();
    const blob = encryptCredentials("fallback");
    expect(decryptCredentials(blob)).toBe("fallback");
  });
});
