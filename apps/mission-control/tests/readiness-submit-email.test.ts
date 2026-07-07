import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/repository", () => ({
  repository: {
    createReadinessSubmission: vi.fn().mockResolvedValue(undefined),
    pushAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/email/resend", () => ({
  buildReadinessClaimEmailHtml: vi.fn(() => "<p>claim</p>"),
  resendConfigured: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue({ id: "email_123" }),
}));

import { POST } from "@/app/api/readiness/submit/route";
import { repository } from "@/lib/data/repository";
import { buildReadinessClaimEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";

const mockResendConfigured = vi.mocked(resendConfigured);
const mockSendEmail = vi.mocked(sendEmail);

function readinessRequest(email?: string) {
  return new Request("https://app.example.com/api/readiness/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scores: {
        organizational_drag: 5,
        ai_maturity: 5,
        data_readiness: 5,
        workflow_standardization: 5,
        governance_maturity: 5,
        regulatory_exposure: 5,
        decision_speed: 5,
      },
      total: 35,
      band: "Advanced",
      sector: "financial_services",
      companySize: "200+",
      role: "CEO",
      email,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("readiness submit claim email", () => {
  it("sends a claim-link email when Resend is configured and an email is supplied", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://nexus.example.com/";
    mockResendConfigured.mockReturnValue(true);

    const res = await POST(readinessRequest("sponsor@example.com"));

    expect(res.status).toBe(200);
    expect(buildReadinessClaimEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      email: "sponsor@example.com",
      claimUrl: expect.stringMatching(/^https:\/\/nexus\.example\.com\/sign-up\?readiness=/),
      band: "Advanced",
    }));
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "sponsor@example.com",
      subject: "Your NexusAI readiness result: Advanced",
    }));
    expect(repository.pushAudit).toHaveBeenCalledWith(expect.objectContaining({
      type: "readiness.claim_email_sent",
    }));
  });

  it("audits a skipped claim email when Resend is not configured", async () => {
    mockResendConfigured.mockReturnValue(false);

    const res = await POST(readinessRequest("sponsor@example.com"));

    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(repository.pushAudit).toHaveBeenCalledWith(expect.objectContaining({
      type: "readiness.claim_email_skipped",
      payload: expect.objectContaining({ reason: "resend_not_configured" }),
    }));
  });
});
