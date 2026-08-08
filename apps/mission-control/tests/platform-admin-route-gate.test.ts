/**
 * Platform-admin gate on the staff-only API routes.
 *
 * The bug this exists to catch: `/api/admin/revenue`, `/api/admin/email-config`
 * and `/api/admin/infrastructure-health` return PLATFORM data — total MRR and
 * subscriber counts across every workspace, the R2 endpoint hostname, the
 * configured sender address — but were gated on `requireScope("admin")` /
 * `requireScope("read:admin")`. Those resolve through `AuthContext.isOrgAdmin`,
 * which lib/api-auth sets to `true` for any caller with no active Clerk org.
 * Every self-signed-up user has no org. So every signed-up user could read
 * Pinavia's revenue. The `/admin` PAGE was gated on `isPlatformAdmin` correctly;
 * only the APIs it fetches were not, and a page gate the browser can step around
 * is not a gate.
 *
 * These tests drive the real `requirePlatformAdmin` from lib/api-auth with only
 * Clerk and the repository mocked, so a route reverting to `requireScope` fails
 * here rather than passing against a stubbed gate.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAdminRevenueSnapshot: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));

vi.mock("@/lib/data/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/repository")>();
  return {
    ...actual,
    repository: {
      getAdminRevenueSnapshot: mocks.getAdminRevenueSnapshot,
      // Unblocked workspace so nothing here can 402 and mask a 200.
      getWorkspaceStatus: vi.fn().mockResolvedValue({
        status: "active",
        trialEndsAt: null,
        suspendedAt: null,
        cancelledAt: null,
      }),
      isAgentKeyUsable: vi.fn().mockResolvedValue(true),
    },
  };
});

const STAFF_ORG = "org_pinavia_staff";
const priorPrincipals = process.env.PINAVIA_ADMIN_PRINCIPALS;
process.env.PINAVIA_ADMIN_PRINCIPALS = STAFF_ORG;

const revenue = await import("@/app/api/admin/revenue/route");
const emailConfig = await import("@/app/api/admin/email-config/route");
const infraHealth = await import("@/app/api/admin/infrastructure-health/route");

afterAll(() => {
  if (priorPrincipals === undefined) delete process.env.PINAVIA_ADMIN_PRINCIPALS;
  else process.env.PINAVIA_ADMIN_PRINCIPALS = priorPrincipals;
});

/** Each route, with the URL it is actually served at. */
const STAFF_ROUTES = [
  { name: "revenue", GET: revenue.GET, path: "/api/admin/revenue" },
  { name: "email-config", GET: emailConfig.GET, path: "/api/admin/email-config" },
  {
    name: "infrastructure-health",
    GET: infraHealth.GET,
    path: "/api/admin/infrastructure-health",
  },
] as const;

function request(path: string): Request {
  return new Request(`https://app.pinavia.io${path}`);
}

describe("staff-only admin routes reject non-platform-admin callers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminRevenueSnapshot.mockResolvedValue({
      activeSubscribers: 12,
      totalWorkspaces: 40,
      mrrCents: 1_200_000,
      planBreakdown: {},
      churned30d: 1,
      suspendedWorkspaces: 0,
      activePilots: 3,
      llmTokensThisMonth: 0,
      llmCostMicrosThisMonth: 0,
      evidenceCount: 0,
      estimatedMonthlyLlmCostCents: 0,
      estimatedMonthlyR2CostCents: 0,
      estimatedMonthlyEmailCostCents: 0,
    });
  });

  for (const route of STAFF_ROUTES) {
    describe(route.name, () => {
      it("401s an anonymous caller", async () => {
        mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

        const response = await route.GET(request(route.path));

        expect(response.status).toBe(401);
      });

      /**
       * The regression itself. A personal (org-less) workspace is what every
       * self-service signup gets, and `isOrgAdmin` is true for it — so under
       * the old `requireScope` gate this call returned 200.
       */
      it("403s a signed-up user with no Clerk org", async () => {
        mocks.auth.mockResolvedValue({
          userId: "user_random_signup",
          orgId: null,
          orgRole: null,
        });

        const response = await route.GET(request(route.path));

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
          error: "platform_admin_required",
        });
      });

      it("403s an admin of some other customer's org", async () => {
        mocks.auth.mockResolvedValue({
          userId: "user_customer_admin",
          orgId: "org_a_customer",
          orgRole: "org:admin",
        });

        const response = await route.GET(request(route.path));

        expect(response.status).toBe(403);
      });

      it("allows a listed Pinavia principal", async () => {
        mocks.auth.mockResolvedValue({
          userId: "user_staff",
          orgId: STAFF_ORG,
          orgRole: "org:admin",
        });

        const response = await route.GET(request(route.path));

        expect(response.status).toBe(200);
      });
    });
  }

  /**
   * Fail-closed check. lib/platform-admin reads the env var per call, so
   * clearing it mid-suite is enough — no module reset needed.
   */
  it("denies even a listed principal when PINAVIA_ADMIN_PRINCIPALS is unset", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_staff",
      orgId: STAFF_ORG,
      orgRole: "org:admin",
    });
    delete process.env.PINAVIA_ADMIN_PRINCIPALS;

    try {
      for (const route of STAFF_ROUTES) {
        const response = await route.GET(request(route.path));
        expect(response.status, route.name).toBe(403);
      }
    } finally {
      process.env.PINAVIA_ADMIN_PRINCIPALS = STAFF_ORG;
    }
  });

  it("does not leak the revenue snapshot in a denied response body", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_random_signup", orgId: null, orgRole: null });

    const response = await revenue.GET(request("/api/admin/revenue"));
    const body = await response.text();

    expect(response.status).toBe(403);
    expect(body).not.toContain("mrrCents");
    // The gate must short-circuit before the platform-wide query runs at all.
    expect(mocks.getAdminRevenueSnapshot).not.toHaveBeenCalled();
  });
});
