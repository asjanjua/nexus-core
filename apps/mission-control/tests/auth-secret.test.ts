/**
 * Regression: requireAuthSecret() must fail closed when NODE_ENV is unset.
 *
 * The fallback was previously `!isProductionRuntime()`, so any process started
 * outside `next start` — a migration script, a worker, a container entrypoint —
 * signed bearer tokens and derived the connector-credential encryption key from
 * a constant published in this repo.
 */
import { describe, expect, it, afterEach } from "vitest";
import { requireAuthSecret } from "@/lib/security";

const originalNodeEnv = process.env.NODE_ENV;
const originalSecret = process.env.AUTH_SECRET;

function setNodeEnv(value: string | undefined) {
  if (value === undefined) delete (process.env as Record<string, unknown>).NODE_ENV;
  else (process.env as Record<string, unknown>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(originalNodeEnv);
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

describe("requireAuthSecret", () => {
  it("returns the configured secret whenever one is set", () => {
    process.env.AUTH_SECRET = "a-real-configured-secret";
    setNodeEnv("production");
    expect(requireAuthSecret()).toBe("a-real-configured-secret");
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    setNodeEnv("production");
    expect(() => requireAuthSecret()).toThrow(/AUTH_SECRET is required/);
  });

  it("throws when NODE_ENV is unset rather than using the dev secret", () => {
    delete process.env.AUTH_SECRET;
    setNodeEnv(undefined);
    expect(() => requireAuthSecret()).toThrow(/AUTH_SECRET is required/);
  });

  it("throws on an unrecognised NODE_ENV rather than using the dev secret", () => {
    delete process.env.AUTH_SECRET;
    setNodeEnv("staging");
    expect(() => requireAuthSecret()).toThrow(/AUTH_SECRET is required/);
  });

  it("allows the dev secret under an explicit development runtime", () => {
    delete process.env.AUTH_SECRET;
    setNodeEnv("development");
    expect(requireAuthSecret()).toBe("nexus-dev-secret");
  });

  it("allows the dev secret under an explicit test runtime", () => {
    delete process.env.AUTH_SECRET;
    setNodeEnv("test");
    expect(requireAuthSecret()).toBe("nexus-dev-secret");
  });
});
