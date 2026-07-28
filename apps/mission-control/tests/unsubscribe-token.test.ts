/**
 * Unsubscribe tokens are handed to a public, unauthenticated route, so they
 * are the only thing standing between an outsider and acting on an arbitrary
 * workspace/address pair. These tests pin the signature requirement.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildUnsubscribeToken, decodeUnsubscribeToken, escapeHtml } from "@/lib/email/resend";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

describe("unsubscribe tokens", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-for-unsubscribe-token-tests";
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = ORIGINAL_SECRET;
  });

  it("round-trips a signed token", () => {
    const token = buildUnsubscribeToken("workspace-demo", "ceo@client.com");
    expect(decodeUnsubscribeToken(token)).toEqual(["workspace-demo", "ceo@client.com"]);
  });

  it("rejects an unsigned token an outsider can assemble", () => {
    const forged = Buffer.from("workspace-victim:ceo@client.com").toString("base64url");
    expect(decodeUnsubscribeToken(forged)).toBeNull();
  });

  it("rejects a tampered payload carrying a valid signature for another payload", () => {
    const token = buildUnsubscribeToken("workspace-demo", "ceo@client.com");
    const signature = token.split(".")[1];
    const swapped = Buffer.from("workspace-victim:ceo@client.com").toString("base64url");
    expect(decodeUnsubscribeToken(`${swapped}.${signature}`)).toBeNull();
  });

  it("escapes markup so a decoded address cannot inject into the confirmation page", () => {
    expect(escapeHtml("<img src=x onerror=alert(1)>@x.com")).not.toContain("<img");
  });
});
