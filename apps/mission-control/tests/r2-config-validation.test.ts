/**
 * R2 config validation — presence is not configuration.
 *
 * THE PRODUCTION FAILURE THIS ENCODES (2026-08-08):
 * R2_ACCOUNT_ID and R2_BUCKET in Render were both set to the literal two
 * characters `""`. Not empty values — a string containing two quote marks.
 *
 * The old check was `Boolean(R2_ACCOUNT_ID && R2_BUCKET && ...)`, and
 * `Boolean('""')` is true. So:
 *   - isOriginalStorageEnabled() returned true
 *   - /api/health reported originalsStorage.ok = true
 *   - the S3 client built https://"".r2.cloudflarestorage.com
 *   - every upload threw, was caught, logged as
 *     ingestion_original_storage_failed, and ingestion continued
 *
 * Evidence originals were never retained, for the entire life of the
 * deployment, and no surface in the product said so.
 *
 * Each case below is a value that is PRESENT but cannot work. Every one of them
 * passes the old truthiness check and must fail the new one.
 *
 * Env is set before import: object-storage.ts captures config into
 * module-level constants at load time.
 */

import { afterAll, describe, expect, it } from "vitest";

const VALID_ACCOUNT = "30e1402d2167e69c3903d4dc2071b379"; // 32 hex
const prior = { ...process.env };

process.env.NEXUS_R2_ORIGINALS = "enabled";
process.env.R2_ACCOUNT_ID = VALID_ACCOUNT;
process.env.R2_BUCKET = "nexus-evidence";
process.env.R2_ACCESS_KEY_ID = "key-abc";
process.env.R2_SECRET_ACCESS_KEY = "secret-abc";

const { r2ConfigProblem, isOriginalStorageEnabled } = await import(
  "@/lib/services/object-storage"
);

afterAll(() => {
  process.env = prior;
});

describe("a correctly configured deployment", () => {
  it("reports no problem", () => {
    expect(r2ConfigProblem()).toBeNull();
  });

  it("is enabled", () => {
    expect(isOriginalStorageEnabled()).toBe(true);
  });
});

/**
 * These run against freshly imported module instances because the config is
 * captured at load time — the same reason the bug was invisible at runtime.
 */
describe("values that are present but cannot work", () => {
  /**
   * No module-reload gymnastics: r2ConfigProblem() reads process.env on every
   * call. If this ever needs cache-busting again, the module has regressed to
   * capturing config at import time and the bug can hide again.
   */
  function problemFor(env: Record<string, string>): string | null {
    const saved = { ...process.env };
    Object.assign(process.env, {
      NEXUS_R2_ORIGINALS: "enabled",
      R2_ACCOUNT_ID: VALID_ACCOUNT,
      R2_BUCKET: "nexus-evidence",
      R2_ACCESS_KEY_ID: "key-abc",
      R2_SECRET_ACCESS_KEY: "secret-abc",
      ...env,
    });
    const result = r2ConfigProblem();
    process.env = saved;
    return result;
  }

  /** The exact production value. Truthy, and completely unusable. */
  it('rejects the literal two-character string `""` as an account id', () => {
    expect(problemFor({ R2_ACCOUNT_ID: '""' })).toBe("malformed_account_id");
  });

  it('rejects `""` as a bucket name', () => {
    expect(problemFor({ R2_BUCKET: '""' })).toBe("malformed_bucket");
  });

  it("rejects an account id that is not 32 hex characters", () => {
    expect(problemFor({ R2_ACCOUNT_ID: "not-an-account" })).toBe("malformed_account_id");
  });

  it("rejects an account id of the right length but wrong alphabet", () => {
    expect(problemFor({ R2_ACCOUNT_ID: "Z".repeat(32) })).toBe("malformed_account_id");
  });

  it("rejects whitespace-only values", () => {
    expect(problemFor({ R2_ACCOUNT_ID: "   " })).toBe("missing_account_id");
  });

  it("rejects a bucket name with uppercase (not a valid DNS label)", () => {
    expect(problemFor({ R2_BUCKET: "Nexus-Evidence" })).toBe("malformed_bucket");
  });

  it("rejects credentials containing a quote mark, which is always a paste error", () => {
    expect(problemFor({ R2_ACCESS_KEY_ID: 'ab"cd' })).toBe("missing_access_key_id");
  });

  it("reports disabled when the feature is off, which is not a fault", () => {
    expect(problemFor({ NEXUS_R2_ORIGINALS: "disabled" })).toBe("disabled");
  });

  /**
   * The regression guard stated as the old behaviour: every value above is
   * truthy, so the presence-only check `Boolean(v)` accepted all of them.
   */
  it("all of these would have passed the old truthiness check", () => {
    for (const v of ['""', "not-an-account", "Z".repeat(32), "   ", 'ab"cd']) {
      expect(Boolean(v)).toBe(true);
    }
  });
});
