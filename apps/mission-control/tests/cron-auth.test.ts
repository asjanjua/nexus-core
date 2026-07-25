/**
 * Shared cron authorization.
 *
 * Was five copy-pasted helpers, each comparing the shared secret with `===`.
 * Now one constant-time implementation in lib/security.ts.
 */
import { describe, expect, it, afterEach } from "vitest";
import { cronAuthorized } from "@/lib/security";

const SECRET = "cron-secret-for-tests-0123456789";
const original = process.env.NEXUS_CRON_SECRET;

afterEach(() => {
  if (original === undefined) delete process.env.NEXUS_CRON_SECRET;
  else process.env.NEXUS_CRON_SECRET = original;
});

function request(headers: Record<string, string>) {
  return new Request("https://x/api/cron/dispatch", { method: "POST", headers });
}

describe("cronAuthorized", () => {
  it("accepts the secret as a bearer token", () => {
    process.env.NEXUS_CRON_SECRET = SECRET;
    expect(cronAuthorized(request({ authorization: `Bearer ${SECRET}` }))).toBe(true);
  });

  it("accepts the secret in x-cron-secret", () => {
    process.env.NEXUS_CRON_SECRET = SECRET;
    expect(cronAuthorized(request({ "x-cron-secret": SECRET }))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    process.env.NEXUS_CRON_SECRET = SECRET;
    expect(cronAuthorized(request({ "x-cron-secret": "wrong" }))).toBe(false);
    expect(cronAuthorized(request({ authorization: "Bearer wrong" }))).toBe(false);
  });

  it("rejects a request with no credentials", () => {
    process.env.NEXUS_CRON_SECRET = SECRET;
    expect(cronAuthorized(request({}))).toBe(false);
  });

  it("fails closed when the secret is not configured", () => {
    delete process.env.NEXUS_CRON_SECRET;
    expect(cronAuthorized(request({ "x-cron-secret": "anything" }))).toBe(false);
  });

  it("rejects a correct prefix of the secret", () => {
    // Guards the length pre-check inside timingSafeEqualString.
    process.env.NEXUS_CRON_SECRET = SECRET;
    expect(cronAuthorized(request({ "x-cron-secret": SECRET.slice(0, -1) }))).toBe(false);
  });
});
