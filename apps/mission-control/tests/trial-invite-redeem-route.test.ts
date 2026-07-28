import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAuth: vi.fn(),
  isWorkspaceProvisioned: vi.fn(),
  redeemAndProvisionTrialInvite: vi.fn(),
  pushAudit: vi.fn(),
  isDemoPackSector: vi.fn(),
  seedSectorPack: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ resolveAuth: mocks.resolveAuth }));
vi.mock("@/lib/data/repository", () => ({
  repository: {
    isWorkspaceProvisioned: mocks.isWorkspaceProvisioned,
    redeemAndProvisionTrialInvite: mocks.redeemAndProvisionTrialInvite,
    pushAudit: mocks.pushAudit,
  },
}));
vi.mock("@/lib/demo/seed-sector-pack", () => ({
  isDemoPackSector: mocks.isDemoPackSector,
  seedSectorPack: mocks.seedSectorPack,
  DemoPackSeedRefusedError: class DemoPackSeedRefusedError extends Error {},
}));

const { POST } = await import("@/app/api/trial-invites/redeem/route");

const request = (code = "a-valid-single-use-code") =>
  new Request("https://app.pinavia.io/api/trial-invites/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });

describe("trial invite redemption route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuth.mockResolvedValue({ userId: "user-prospect", workspaceId: "org-prospect" });
    mocks.isWorkspaceProvisioned.mockResolvedValue(true);
    mocks.pushAudit.mockResolvedValue(undefined);
    mocks.isDemoPackSector.mockReturnValue(false);
  });

  it("does not consume a code before the workspace exists", async () => {
    mocks.isWorkspaceProvisioned.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.redeemAndProvisionTrialInvite).not.toHaveBeenCalled();
  });

  it("redeems through the atomic entitlement method", async () => {
    mocks.redeemAndProvisionTrialInvite.mockResolvedValue({
      invite: {
        id: "ti_1", email: "prospect@example.com", name: null, company: null, note: null,
        demoPack: null, status: "redeemed", redeemedBy: "user-prospect", redeemedWorkspaceId: "org-prospect",
        invitedBy: "user-staff", trialDays: 30, redeemedAt: "2026-07-26T00:00:00.000Z",
        revokedAt: null, expiresAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
      expiresAt: "2026-08-25T00:00:00.000Z",
    });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.redeemAndProvisionTrialInvite).toHaveBeenCalledWith(
      expect.any(String), "user-prospect", "org-prospect"
    );
    expect(body).toMatchObject({
      ok: true,
      data: { plan: "pro", trialExpiresAt: "2026-08-25T00:00:00.000Z", demoSeeded: false },
    });
  });

  it("seeds an authorised sector pack server-side without enabling demo mode", async () => {
    mocks.redeemAndProvisionTrialInvite.mockResolvedValue({
      invite: {
        id: "ti_2", email: "prospect@example.com", name: null, company: null, note: null,
        demoPack: "financial_services", status: "redeemed", redeemedBy: "user-prospect", redeemedWorkspaceId: "org-prospect",
        invitedBy: "user-staff", trialDays: 30, redeemedAt: "2026-07-26T00:00:00.000Z",
        revokedAt: null, expiresAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      },
      expiresAt: "2026-08-25T00:00:00.000Z",
    });
    mocks.isDemoPackSector.mockReturnValue(true);
    mocks.seedSectorPack.mockResolvedValue({ evidenceSeeded: 4 });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.seedSectorPack).toHaveBeenCalledWith({
      workspaceId: "org-prospect", actor: "user-prospect", sector: "financial_services",
    });
    expect(body).toMatchObject({ ok: true, data: { demoSeeded: true } });
  });
});
