import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAuth: vi.fn(),
  isPlatformAdmin: vi.fn(),
  listTrialInvites: vi.fn(),
  createTrialInvite: vi.fn(),
  pushAudit: vi.fn(),
  resendConfigured: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ resolveAuth: mocks.resolveAuth }));
vi.mock("@/lib/platform-admin", () => ({ isPlatformAdmin: mocks.isPlatformAdmin }));
vi.mock("@/lib/data/repository", () => ({
  repository: {
    listTrialInvites: mocks.listTrialInvites,
    createTrialInvite: mocks.createTrialInvite,
    pushAudit: mocks.pushAudit,
  },
}));
vi.mock("@/lib/email/resend", () => ({
  resendConfigured: mocks.resendConfigured,
  sendEmail: mocks.sendEmail,
  buildTrialInviteEmailHtml: vi.fn(() => "<p>invite</p>"),
}));

const { GET, POST } = await import("@/app/api/admin/trial-invites/route");

const staff = { userId: "user-staff", workspaceId: "org-staff" };
const invite = {
  id: "ti_1",
  email: "prospect@example.com",
  name: null,
  company: null,
  note: null,
  demoPack: null,
  status: "invited",
  redeemedBy: null,
  redeemedWorkspaceId: null,
  invitedBy: "user-staff",
  trialDays: 30,
  redeemedAt: null,
  revokedAt: null,
  expiresAt: "2026-08-16T00:00:00.000Z",
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("trial invite admin API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuth.mockResolvedValue(staff);
    mocks.isPlatformAdmin.mockReturnValue(true);
    mocks.listTrialInvites.mockResolvedValue([invite]);
    mocks.createTrialInvite.mockResolvedValue(invite);
    mocks.pushAudit.mockResolvedValue(undefined);
    mocks.resendConfigured.mockReturnValue(false);
  });

  it("returns listed invites inside the standard success envelope", async () => {
    const response = await GET(new Request("https://app.pinavia.io/api/admin/trial-invites"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { invites: [invite] } });
  });

  it("returns an issued invite inside the same envelope", async () => {
    const priorAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.pinavia.co";
    try {
      const response = await POST(
        new Request("http://localhost:10000/api/admin/trial-invites", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-host": "app.pinavia.io",
            "x-forwarded-proto": "https",
          },
          body: JSON.stringify({ email: "prospect@example.com", trialDays: 30 }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        data: { invite, emailSent: false },
      });
      expect(typeof body.data.inviteCode).toBe("string");
      expect(body.data.acceptUrl).toMatch(/^https:\/\/app\.pinavia\.io\/invite\/accept\?code=/);
    } finally {
      if (priorAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = priorAppUrl;
    }
  });
});
