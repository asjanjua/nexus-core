/**
 * AES-256-GCM credential encryption — contract tests.
 *
 * Proves the five properties the IMAP connector review requires:
 *   1. Round-trip: decrypt(encrypt(x)) === x
 *   2. Unique IVs: same plaintext produces different ciphertexts
 *   3. Tamper detection: flipped bits return null
 *   4. Invalid input: non-base64 returns null
 *   5. Edge case: empty string round-trips
 */

import { describe, expect, it, beforeAll } from "vitest";

// AUTH_SECRET must exist before crypto.ts calls requireAuthSecret()
beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-crypto-unit-tests-minimum-32";
});

import { encryptCredentials, decryptCredentials } from "@/lib/crypto";

describe("credential encryption (AES-256-GCM)", () => {
  it("round-trips a plain-text string", () => {
    const original = "hello";
    const encrypted = encryptCredentials(original);
    expect(decryptCredentials(encrypted)).toBe(original);
  });

  it("produces different ciphertexts for the same input (unique IVs)", () => {
    const a = encryptCredentials("a");
    const b = encryptCredentials("a");
    expect(a).not.toBe(b);
  });

  it("returns null for a tampered blob", () => {
    const encrypted = encryptCredentials("sensitive-data");
    // Flip a character in the middle of the base64url blob
    const chars = encrypted.split("");
    const mid = Math.floor(chars.length / 2);
    chars[mid] = chars[mid] === "A" ? "B" : "A";
    const tampered = chars.join("");
    expect(decryptCredentials(tampered)).toBeNull();
  });

  it("returns null for invalid base64 input", () => {
    expect(decryptCredentials("not-valid-base64!!!")).toBeNull();
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptCredentials("");
    expect(decryptCredentials(encrypted)).toBe("");
  });
});
