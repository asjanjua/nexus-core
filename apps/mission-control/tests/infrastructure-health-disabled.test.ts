/**
 * /api/admin/infrastructure-health when R2 originals are switched OFF.
 *
 * Separate file from infrastructure-health-route.test.ts because
 * lib/services/object-storage.ts captures its config into module-level
 * constants at import time. NEXUS_R2_ORIGINALS has to be set before the module
 * graph loads, so the two states cannot share one module registry.
 *
 * The gap this closes: the enabled-and-configured path was pinned, the disabled
 * path was not. It matters because "R2 is deliberately off" and "R2 is on but
 * broken" must not report the same way. Conflating them either hides a real
 * misconfiguration behind a shrug, or trains operators to ignore a permanent
 * red — which is exactly the failure this route already had once.
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
  DATABASE_URL: process.env.DATABASE_URL,
};

process.env.NEXUS_R2_ORIGINALS = "disabled";
process.env.DATABASE_URL = "postgres://user:pw@ep-test.eu-central-1.aws.neon.tech/neondb";

const { GET } = await import("@/app/api/admin/infrastructure-health/route");

afterAll(() => {
  for (const [key, value] of Object.entries(prior)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

type Check = { name: string; status: string; detail: string };

async function runChecks(): Promise<{ overall: string; checks: Check[] }> {
  const response = await GET(new Request("https://app.pinavia.io/api/admin/infrastructure-health"));
  const body = (await response.json()) as { data: { overall: string; checks: Check[] } };
  return body.data;
}

describe("infrastructure health with R2 originals disabled", () => {
  it("reports disabled, not not_configured", async () => {
    const { checks } = await runChecks();
    const r2 = checks.find((c) => c.name === "r2_bucket");

    expect(r2?.status).toBe("disabled");
  });

  /**
   * A deliberate configuration choice is not a fault. If this ever flips to
   * degraded, the route is crying wolf again and operators will stop reading it.
   */
  it("stays healthy overall — switching originals off is a choice, not a fault", async () => {
    const { overall } = await runChecks();

    expect(overall).toBe("healthy");
  });

  it("says plainly that originals are not being retained", async () => {
    const { checks } = await runChecks();
    const r2 = checks.find((c) => c.name === "r2_bucket");

    expect(r2?.detail).toMatch(/not retained/i);
    expect(r2?.detail).toMatch(/not a fault/i);
  });

  it("still refuses to assert a Neon retention window", async () => {
    const { checks } = await runChecks();
    const neon = checks.find((c) => c.name === "neon_backup");

    expect(neon?.status).toBe("manual_verification_required");
  });
});
