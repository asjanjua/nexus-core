import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDbConfigured, isDbRequired } from "@/lib/data/db-policy";

// vi.stubEnv is the correct Vitest API for mutating process.env in tests.
// Direct assignment to NODE_ENV fails TypeScript strict mode because the
// @types/node declaration marks it as readonly. vi.stubEnv bypasses the
// readonly constraint and automatically restores original values after each
// test when used with the afterEach vi.unstubAllEnvs() call below.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("db policy", () => {
  it("defaults to required in production", () => {
    vi.stubEnv("NEXUS_DB_REQUIRED", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDbRequired()).toBe(true);
  });

  it("honors explicit off switch", () => {
    vi.stubEnv("NEXUS_DB_REQUIRED", "false");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDbRequired()).toBe(false);
  });

  it("throws when required mode has no DATABASE_URL", () => {
    vi.stubEnv("NEXUS_DB_REQUIRED", "true");
    vi.stubEnv("DATABASE_URL", "");
    expect(() => assertDbConfigured()).toThrow(/DATABASE_URL is required/i);
  });

  it("does not require db during Next.js build phase unless explicitly forced", () => {
    vi.stubEnv("NEXUS_DB_REQUIRED", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    expect(isDbRequired()).toBe(false);
  });
});
