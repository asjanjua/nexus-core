/**
 * Unsubscribe tokens are handed to a public, unauthenticated route, so they
 * are the only thing standing between an outsider and acting on an arbitrary
 * workspace/address pair. These tests pin the signature requirement.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnsubscribeToken, decodeUnsubscribeToken, escapeHtml } from "@/lib/email/resend";
import { signHmacHex } from "@/lib/security";
import { __resetReportCooldownForTests } from "@/lib/observability/report";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

/** A token in the pre-2026-07-28 format: base64url payload, no signature. */
const unsignedToken = (workspaceId: string, email: string) =>
  Buffer.from(`${workspaceId}:${email}`).toString("base64url");

describe("unsubscribe tokens", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-for-unsubscribe-token-tests";
  });

  beforeEach(() => {
    __resetReportCooldownForTests();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = ORIGINAL_SECRET;
  });

  it("round-trips a signed token", () => {
    const token = buildUnsubscribeToken("workspace-demo", "ceo@client.com");
    expect(decodeUnsubscribeToken(token)).toEqual(["workspace-demo", "ceo@client.com"]);
  });

  it("signs with a purpose-derived subkey, not AUTH_SECRET directly", () => {
    // So that rotating AUTH_SECRET to invalidate sessions does not also,
    // silently, kill every outstanding unsubscribe link.
    const [body, signature] = buildUnsubscribeToken("workspace-demo", "ceo@client.com").split(".");
    expect(signature).not.toBe(signHmacHex(body));
  });

  // -- Legacy grace window (docs/PR_REVIEW_2026-08-08.md §6.1) --------------
  //
  // DELIBERATE, TIME-BOXED WEAKENING. Signing landed on 2026-07-28 with no
  // grace period, which killed the unsubscribe link in every brief already
  // delivered. An unsigned token is forgeable, but the only thing a forgery
  // achieves is unsubscribing an address the attacker already knows — weighed
  // against spam complaints and a non-functioning unsubscribe mechanism under
  // CAN-SPAM and GDPR Art. 21, the window is the better trade.
  //
  // These two tests are the contract: accepted now, rejected after
  // 2026-10-31. When the second one starts being the only relevant case,
  // delete the branch and both tests.

  it("accepts a legacy unsigned token during the grace window, and reports it", () => {
    const result = decodeUnsubscribeToken(unsignedToken("workspace-victim", "ceo@client.com"));
    expect(result).toEqual(["workspace-victim", "ceo@client.com"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unsubscribe_token_legacy_unsigned")
    );
  });

  it("rejects a legacy unsigned token once the grace window has closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
    expect(decodeUnsubscribeToken(unsignedToken("workspace-victim", "ceo@client.com"))).toBeNull();
  });

  it("accepts a token signed with the raw secret during the window, and rejects it after", () => {
    // Issued between 2026-07-28 and 2026-08-08, before per-purpose key
    // derivation. Same window, same deletion date.
    const body = unsignedToken("workspace-demo", "ceo@client.com");
    const rawSigned = `${body}.${signHmacHex(body)}`;
    expect(decodeUnsubscribeToken(rawSigned)).toEqual(["workspace-demo", "ceo@client.com"]);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
    expect(decodeUnsubscribeToken(rawSigned)).toBeNull();
  });

  it("rejects a garbage token that happens to contain a dot", () => {
    expect(decodeUnsubscribeToken("not-base64.not-a-signature")).toBeNull();
    expect(decodeUnsubscribeToken("a.b.c")).toBeNull();
    expect(decodeUnsubscribeToken(".")).toBeNull();
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
