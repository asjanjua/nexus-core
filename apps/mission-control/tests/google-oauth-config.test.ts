import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  requireScope: vi.fn(async () => ({
    ctx: { workspaceId: "ws-test", userId: "user-test", scopes: ["*"], authType: "session" },
    error: null,
  })),
}));

vi.mock("@/lib/security", () => ({
  requireAuthSecret: vi.fn(() => "test_auth_secret"),
}));

import { GET as installGoogleDrive } from "@/app/api/connectors/google-drive/install/route";
import { GET as installGmail } from "@/app/api/connectors/gmail/install/route";
import { getAuthUrl as getGoogleDriveAuthUrl, googleDriveOAuthConfigured } from "@/lib/connectors/google-drive";
import { getAuthUrl as getGmailAuthUrl, gmailOAuthConfigured } from "@/lib/connectors/gmail";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: "https://app.pinavia.co" };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("Google connector OAuth configuration", () => {
  it("treats blank Google credentials as unconfigured before redirecting to Google Drive OAuth", async () => {
    process.env.GOOGLE_CLIENT_ID = "   ";
    process.env.GOOGLE_CLIENT_SECRET = "secret";

    const res = await installGoogleDrive(new Request("https://app.pinavia.co/api/connectors/google-drive/install"));

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: "google_client_id_not_configured" });
    expect(googleDriveOAuthConfigured()).toBe(false);
  });

  it("treats blank Google secrets as unconfigured before redirecting to Gmail OAuth", async () => {
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "   ";

    const res = await installGmail(new Request("https://app.pinavia.co/api/connectors/gmail/install"));

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: "google_client_id_not_configured" });
    expect(gmailOAuthConfigured()).toBe(false);
  });

  it("trims Google credentials before constructing provider URLs", () => {
    process.env.GOOGLE_CLIENT_ID = " client-id.apps.googleusercontent.com ";
    process.env.GOOGLE_CLIENT_SECRET = " secret ";

    const driveUrl = new URL(getGoogleDriveAuthUrl({ state: "state" }));
    const gmailUrl = new URL(getGmailAuthUrl({ state: "state" }));

    expect(driveUrl.searchParams.get("client_id")).toBe("client-id.apps.googleusercontent.com");
    expect(gmailUrl.searchParams.get("client_id")).toBe("client-id.apps.googleusercontent.com");
    expect(driveUrl.searchParams.get("redirect_uri")).toBe(
      "https://app.pinavia.co/api/connectors/google-drive/callback"
    );
    expect(gmailUrl.searchParams.get("redirect_uri")).toBe("https://app.pinavia.co/api/connectors/gmail/callback");
  });
});
