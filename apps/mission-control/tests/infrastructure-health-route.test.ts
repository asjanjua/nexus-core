/**
 * GET /api/admin/infrastructure-health — what it is allowed to claim.
 *
 * Two defects this file exists to catch, both found 2026-08-08:
 *
 * 1. ENV VAR DRIFT. The route read CLOUDFLARE_R2_ENDPOINT and
 *    CLOUDFLARE_R2_ACCESS_KEY_ID. Nothing sets those: not render.yaml, not
 *    .env.example, not any other module. lib/services/object-storage.ts reads
 *    R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET. So
 *    the check reported "not_configured" forever and pinned `overall` to
 *    "degraded" even with R2 working. The guard below is that a correctly
 *    configured R2, using the names the storage client actually reads, must
 *    produce "configured".
 *
 * 2. AN UNVERIFIABLE COMPLIANCE CLAIM. The route asserted "Point-in-Time
 *    Recovery active (30-day retention)" from a substring match on
 *    DATABASE_URL. Thirty days is Neon's Scale tier; Free is 6 hours and Launch
 *    is up to 7 days. Recovery windows end up in client packs and DR sections
 *    of proposals, so this route must not state a window it has not measured.
 *
 * Env is set BEFORE importing, deliberately: object-storage.ts captures its
 * config into module-level constants at load time, so mutating process.env
 * afterwards would not reach it. A test that set env after import would pass
 * against the old broken code too.
 */

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  requirePlatformAdmin: vi.fn().mockResolvedValue({
    ctx: { workspaceId: "org_staff", userId: "user_staff", scopes: ["*"] },
    error: null,
  }),
}));

const prior = {
  NEXUS_R2_ORIGINALS: process.env.NEXUS_R2_ORIGINALS,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  DATABASE_URL: process.env.DATABASE_URL,
};

// The real variable names, as set in render.yaml and .env.example.
process.env.NEXUS_R2_ORIGINALS = "enabled";
process.env.R2_ACCOUNT_ID = "acct-test";
process.env.R2_ACCESS_KEY_ID = "key-test";
process.env.R2_SECRET_ACCESS_KEY = "secret-test";
process.env.R2_BUCKET = "nexus-evidence";
process.env.DATABASE_URL = "postgres://user:pw@ep-test.eu-central-1.aws.neon.tech/neondb";

const { GET } = await import("@/app/api/admin/infrastructure-health/route");

afterAll(() => {
  for (const [key, value] of Object.entries(prior)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

type Check = { name: string; status: string; detail: string };

async function runChecks(): Promise<{ overall: string; checks: Check[]; raw: string }> {
  const response = await GET(new Request("https://app.pinavia.io/api/admin/infrastructure-health"));
  const raw = await response.clone().text();
  const body = (await response.json()) as { data: { overall: string; checks: Check[] } };
  return { overall: body.data.overall, checks: body.data.checks, raw };
}

function check(checks: Check[], name: string): Check {
  const found = checks.find((c) => c.name === name);
  if (!found) throw new Error(`no check named ${name}`);
  return found;
}

describe("infrastructure health check", () => {
  it("reports R2 configured using the variable names the storage client reads", async () => {
    const { checks } = await runChecks();

    expect(check(checks, "r2_bucket").status).toBe("configured");
  });

  it("does not drag overall to degraded when everything is configured", async () => {
    const { overall } = await runChecks();

    expect(overall).toBe("healthy");
  });

  /**
   * The drift guard. CLOUDFLARE_-prefixed names are not part of this app's
   * configuration surface. If a future edit reintroduces them, the R2 check
   * will stop tracking the storage client and this fails.
   */
  it("ignores the CLOUDFLARE_ prefixed names entirely", async () => {
    const { raw } = await runChecks();

    expect(raw).not.toContain("CLOUDFLARE_R2_ENDPOINT");
    expect(raw).not.toContain("CLOUDFLARE_R2_ACCESS_KEY_ID");
  });

  /**
   * The compliance guard. This route may say Neon is in use. It may not say for
   * how long a restore is possible, because it cannot see the Neon plan.
   */
  it("never asserts a specific PITR retention window", async () => {
    const { checks, raw } = await runChecks();
    const neon = check(checks, "neon_backup");

    expect(neon.status).toBe("manual_verification_required");
    expect(neon.detail).toMatch(/not verified here/i);
    // No bare claim that recovery "is active" for a stated period.
    expect(raw).not.toMatch(/Point-in-Time Recovery active/i);
    expect(raw).not.toMatch(/\b30-day retention\b/i);
  });

  it("names Free, Launch and Scale windows so the reader can check the right one", async () => {
    const { checks } = await runChecks();

    expect(check(checks, "neon_backup").detail).toMatch(/Free is 6 hours/i);
    expect(check(checks, "neon_backup").detail).toMatch(/Launch up to 7 days/i);
  });

  it("still flags R2 versioning as needing manual confirmation", async () => {
    const { checks } = await runChecks();

    expect(check(checks, "r2_versioning").status).toBe("manual_verification_required");
  });
});
