import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emailSendAllowed, sendEmail } from "@/lib/email/resend";

const ORIGINAL_ENV = { ...process.env };

function setEnv(env: string | undefined, allowlist: string | undefined) {
  if (env === undefined) delete process.env.NEXUS_ENV;
  else process.env.NEXUS_ENV = env;
  if (allowlist === undefined) delete process.env.NEXUS_EMAIL_ALLOWLIST;
  else process.env.NEXUS_EMAIL_ALLOWLIST = allowlist;
}

describe("production email boundary", () => {
  beforeEach(() => {
    process.env.NEXUS_RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows any recipient in pilot", () => {
    setEnv("pilot", undefined);
    expect(emailSendAllowed("ceo@client.com").allowed).toBe(true);
  });

  it("allows any recipient in production", () => {
    setEnv("production", undefined);
    expect(emailSendAllowed(["a@x.com", "b@y.com"]).allowed).toBe(true);
  });

  it("blocks all recipients outside production when no allowlist is set", () => {
    setEnv("development", undefined);
    const result = emailSendAllowed("ceo@client.com");
    expect(result.allowed).toBe(false);
    expect(result.blocked).toEqual(["ceo@client.com"]);
  });

  it("allows exact addresses on the allowlist outside production", () => {
    setEnv("development", "ali.janjua@live.com,@pinavia.io");
    expect(emailSendAllowed("ali.janjua@live.com").allowed).toBe(true);
    expect(emailSendAllowed("Ali.Janjua@Live.com").allowed).toBe(true);
  });

  it("allows @domain rules and blocks everyone else", () => {
    setEnv("development", "@pinavia.io");
    expect(emailSendAllowed("dev@pinavia.io").allowed).toBe(true);
    const mixed = emailSendAllowed(["dev@pinavia.io", "ceo@client.com"]);
    expect(mixed.allowed).toBe(false);
    expect(mixed.blocked).toEqual(["ceo@client.com"]);
  });

  it("sendEmail refuses blocked recipients before any network call", async () => {
    setEnv("development", "@pinavia.io");
    await expect(
      sendEmail({ to: "ceo@client.com", subject: "x", html: "<p>x</p>" })
    ).rejects.toThrow(/email_blocked_nonproduction/);
  });
});
