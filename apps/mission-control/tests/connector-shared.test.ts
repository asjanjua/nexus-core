/**
 * Covers the shared connector utilities the per-provider install/callback/
 * files/ingest routes were collapsed onto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listConnectors, getConnectorCredentials, upsertConnector } = vi.hoisted(() => ({
  listConnectors: vi.fn(),
  getConnectorCredentials: vi.fn(),
  upsertConnector: vi.fn(),
}));

vi.mock("@/lib/data/repository", () => ({
  repository: { listConnectors, getConnectorCredentials, upsertConnector },
}));

import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import {
  connectorAppUrl,
  redirectWithConnectorError,
  redirectWithConnectorInstalled,
} from "@/lib/connectors/shared/oauth-callback";
import {
  signConnectorState,
  verifyConnectorState,
} from "@/lib/connectors/shared/oauth-state";
import {
  decodeDownloadedText,
  estimateExtractionConfidence,
  evidenceHash,
  readStreamToBuffer,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV, AUTH_SECRET: "test_auth_secret" };
});

afterEach(() => {
  vi.useRealTimers();
  process.env = ORIGINAL_ENV;
});

describe("connector OAuth state", () => {
  it("round-trips the workspace id", () => {
    const state = signConnectorState("ws-1");
    expect(verifyConnectorState(state)?.workspaceId).toBe("ws-1");
  });

  it("rejects a tampered payload, a bad signature, and a malformed state", () => {
    const [encoded, sig] = signConnectorState("ws-1").split(".");
    const forged = Buffer.from(
      JSON.stringify({ workspaceId: "ws-attacker", ts: Date.now() })
    ).toString("base64url");

    expect(verifyConnectorState(`${forged}.${sig}`)).toBeNull();
    expect(verifyConnectorState(`${encoded}.${"0".repeat(sig.length)}`)).toBeNull();
    expect(verifyConnectorState(encoded)).toBeNull();
  });

  it("rejects a state older than ten minutes", () => {
    const state = signConnectorState("ws-1");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(verifyConnectorState(state)).toBeNull();
  });

  it("rejects a state signed with a different secret", () => {
    const state = signConnectorState("ws-1");
    process.env.AUTH_SECRET = "another_secret";
    expect(verifyConnectorState(state)).toBeNull();
  });
});

describe("connector callback redirects", () => {
  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(connectorAppUrl()).toBe("http://localhost:3000");
  });

  it("redirects to the connectors settings page with the outcome", () => {
    const appUrl = "https://app.example.com";

    expect(redirectWithConnectorError(appUrl, "invalid_state").headers.get("location")).toBe(
      "https://app.example.com/settings/connectors?error=invalid_state"
    );
    expect(
      redirectWithConnectorInstalled(appUrl, "SharePoint / Teams").headers.get("location")
    ).toBe(
      "https://app.example.com/settings/connectors?installed=SharePoint+%2F+Teams"
    );
  });
});

describe("getActiveConnector", () => {
  it("returns only active connectors of the requested type", async () => {
    listConnectors.mockResolvedValue([
      { id: "conn-1", type: "gmail", status: "active" },
      { id: "conn-2", type: "jira", status: "revoked" },
    ]);

    expect(await getActiveConnector("ws-1", "gmail")).toMatchObject({ id: "conn-1" });
    expect(await getActiveConnector("ws-1", "jira")).toBeNull();
    expect(await getActiveConnector("ws-1", "slack")).toBeNull();
  });
});

describe("getValidConnectorAuth", () => {
  const refreshAccessToken = vi.fn();

  it("returns the stored token while it is still fresh", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "fresh-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date().toISOString(),
      expiresIn: 3600,
    });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "sharepoint",
      refreshAccessToken,
    });

    expect(auth?.accessToken).toBe("fresh-token");
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(upsertConnector).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and persists the new credentials", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
      cloudId: "cloud-1",
    });
    refreshAccessToken.mockResolvedValue({
      access_token: "new-token",
      expires_in: 3600,
    });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "jira",
      refreshAccessToken,
      requiredCredentials: ["cloudId"] as const,
    });

    expect(auth).toMatchObject({ accessToken: "new-token", cloudId: "cloud-1" });
    expect(upsertConnector).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        type: "jira",
        installedBy: "token-refresh",
        credentials: expect.objectContaining({
          accessToken: "new-token",
          refreshToken: "refresh-token",
          cloudId: "cloud-1",
        }),
      })
    );
  });

  it("returns null when the refresh call fails", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(
      getValidConnectorAuth({
        workspaceId: "ws-1",
        type: "gmail",
        refreshAccessToken,
      })
    ).resolves.toBeNull();
  });

  it("returns null when a required credential field is missing", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "fresh-token",
      obtainedAt: new Date().toISOString(),
      expiresIn: 3600,
    });

    await expect(
      getValidConnectorAuth({
        workspaceId: "ws-1",
        type: "quickbooks",
        refreshAccessToken,
        requiredCredentials: ["realmId"] as const,
      })
    ).resolves.toBeNull();
  });

  it("omits absent optional credential fields", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "fresh-token",
      obtainedAt: new Date().toISOString(),
      expiresIn: 3600,
    });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "linkedin",
      refreshAccessToken,
      optionalCredentials: ["defaultOrgUrn"] as const,
    });

    expect(auth).toEqual({ accessToken: "fresh-token" });
  });

  it("treats a token without an expiry as usable when the provider never expires it", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "classic-token",
      refreshToken: "refresh-token",
    });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "github",
      refreshAccessToken,
      treatMissingExpiryAsFresh: true,
    });

    expect(auth?.accessToken).toBe("classic-token");
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("returns null when no credentials or no access token are stored", async () => {
    getConnectorCredentials.mockResolvedValueOnce(null);
    await expect(
      getValidConnectorAuth({ workspaceId: "ws-1", type: "gmail", refreshAccessToken })
    ).resolves.toBeNull();

    getConnectorCredentials.mockResolvedValueOnce({ refreshToken: "refresh-token" });
    await expect(
      getValidConnectorAuth({ workspaceId: "ws-1", type: "gmail", refreshAccessToken })
    ).resolves.toBeNull();
  });
});

describe("connector ingest helpers", () => {
  it("derives the tenant id from the workspace id", () => {
    expect(tenantIdForWorkspace("workspace-acme")).toBe("tenant-acme");
  });

  it("hashes text and buffers identically", () => {
    expect(evidenceHash("hello")).toBe(evidenceHash(Buffer.from("hello")));
    expect(evidenceHash("hello")).not.toContain("=");
  });

  it("reads a download stream into a single buffer", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("chunk-1 "));
        controller.enqueue(new TextEncoder().encode("chunk-2"));
        controller.close();
      },
    });

    const buffer = await readStreamToBuffer(stream);
    expect(buffer.toString("utf-8")).toBe("chunk-1 chunk-2");
  });

  it("falls back to base64 for binary downloads", () => {
    expect(decodeDownloadedText(Buffer.from("plain text"))).toBe("plain text");
    const binary = Buffer.from([0x50, 0x00, 0x4b]);
    expect(decodeDownloadedText(binary)).toBe(binary.toString("base64"));
  });

  it("estimates extraction confidence by content type", () => {
    expect(estimateExtractionConfidence("text/plain; charset=utf-8")).toBe(0.95);
    expect(estimateExtractionConfidence("application/vnd.google-apps.document")).toBe(0.9);
    expect(estimateExtractionConfidence("application/pdf")).toBe(0.85);
    expect(
      estimateExtractionConfidence(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(0.85);
    expect(estimateExtractionConfidence("image/png")).toBe(0.6);
  });
});
