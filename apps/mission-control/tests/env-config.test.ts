/**
 * Required-environment validation.
 *
 * Previously a missing production secret surfaced as a runtime failure deep in
 * whichever request path touched it first, one variable at a time.
 */
import { describe, expect, it, afterEach } from "vitest";
import { assertRequiredEnv, checkRequiredEnv, formatEnvReport } from "@/lib/config/env";

const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_DOMAIN",
];

const saved = new Map<string, string | undefined>(
  [...REQUIRED, "NODE_ENV", "NEXT_PHASE"].map((k) => [k, process.env[k]])
);

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) delete (process.env as Record<string, unknown>)[key];
  else (process.env as Record<string, unknown>)[key] = value;
}

function setAllRequired() {
  for (const key of REQUIRED) setEnv(key, `value-for-${key}`);
}

afterEach(() => {
  for (const [key, value] of saved) setEnv(key, value);
});

describe("checkRequiredEnv", () => {
  it("passes outside production regardless of what is set", () => {
    setEnv("NODE_ENV", "development");
    for (const key of REQUIRED) setEnv(key, undefined);
    expect(checkRequiredEnv().ok).toBe(true);
  });

  it("passes during the production build, which runs without secrets", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", "phase-production-build");
    for (const key of REQUIRED) setEnv(key, undefined);
    expect(checkRequiredEnv().ok).toBe(true);
  });

  it("passes in production when every required variable is set", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    expect(checkRequiredEnv().ok).toBe(true);
  });

  it("reports every missing variable at once, not just the first", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    setEnv("DATABASE_URL", undefined);
    setEnv("CLERK_SECRET_KEY", undefined);

    const report = checkRequiredEnv();
    expect(report.ok).toBe(false);
    expect(report.missing.map((m) => m.key).sort()).toEqual(["CLERK_SECRET_KEY", "DATABASE_URL"]);
  });

  it("requires NEXT_PUBLIC_CLERK_DOMAIN, which the CSP allowlist is built from", () => {
    // Unset, the CSP allowlists clerk.accounts.dev and a custom-domain Clerk
    // instance is blocked at the browser — auth fails with only a console
    // violation to show for it.
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    setEnv("NEXT_PUBLIC_CLERK_DOMAIN", undefined);

    expect(checkRequiredEnv().missing.map((m) => m.key)).toContain("NEXT_PUBLIC_CLERK_DOMAIN");
  });

  it("treats a whitespace-only value as missing", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    setEnv("AUTH_SECRET", "   ");

    expect(checkRequiredEnv().missing.map((m) => m.key)).toContain("AUTH_SECRET");
  });
});

describe("formatEnvReport", () => {
  it("explains why each missing variable matters", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    setEnv("NEXT_PUBLIC_APP_URL", undefined);

    const text = formatEnvReport(checkRequiredEnv());
    expect(text).toContain("NEXT_PUBLIC_APP_URL");
    expect(text).toContain("OAuth callbacks");
  });
});

describe("assertRequiredEnv", () => {
  it("throws listing the missing variables", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    setEnv("DATABASE_URL", undefined);

    expect(() => assertRequiredEnv()).toThrow(/DATABASE_URL/);
  });

  it("does not throw when the environment is complete", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXT_PHASE", undefined);
    setAllRequired();
    expect(() => assertRequiredEnv()).not.toThrow();
  });
});
