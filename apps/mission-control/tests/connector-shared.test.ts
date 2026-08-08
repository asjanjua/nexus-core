/**
 * Covers the shared connector utilities the per-provider install/callback/
 * files/ingest routes were collapsed onto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listConnectors, getConnectorCredentials, upsertConnector, withAdvisoryLock } =
  vi.hoisted(() => ({
    listConnectors: vi.fn(),
    getConnectorCredentials: vi.fn(),
    upsertConnector: vi.fn(),
    // Default: pass through. Individual tests replace this when they need to
    // observe or delay lock acquisition.
    withAdvisoryLock: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  }));

vi.mock("@/lib/data/repository", () => ({
  repository: { listConnectors, getConnectorCredentials, upsertConnector, withAdvisoryLock },
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
  __resetConsumedNoncesForTests,
  consumeConnectorState,
  signConnectorState,
  verifyConnectorState,
} from "@/lib/connectors/shared/oauth-state";
import { signHmacHexFor } from "@/lib/security";
import { __resetReportCooldownForTests } from "@/lib/observability/report";
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
  // The observability cooldown is process-global and keyed on
  // errorType:route:workspaceId. Without this reset, the second test in this
  // file to trigger the same event silently logs nothing and its assertion
  // fails for a reason that has nothing to do with what it is testing.
  __resetReportCooldownForTests();
});

afterEach(() => {
  vi.useRealTimers();
  process.env = ORIGINAL_ENV;
});

describe("connector OAuth state", () => {
  beforeEach(() => {
    __resetConsumedNoncesForTests();
  });

  it("round-trips the workspace id and the initiating user", () => {
    const state = signConnectorState("ws-1", "user-1");
    expect(verifyConnectorState(state)).toMatchObject({
      workspaceId: "ws-1",
      userId: "user-1",
    });
  });

  it("rejects a tampered payload, a bad signature, and a malformed state", () => {
    const [encoded, sig] = signConnectorState("ws-1", "user-1").split(".");
    const forged = Buffer.from(
      JSON.stringify({ workspaceId: "ws-attacker", userId: "user-1", nonce: "n", ts: Date.now() })
    ).toString("base64url");

    expect(verifyConnectorState(`${forged}.${sig}`)).toBeNull();
    expect(verifyConnectorState(`${encoded}.${"0".repeat(sig.length)}`)).toBeNull();
    expect(verifyConnectorState(encoded)).toBeNull();
  });

  it("rejects a state older than ten minutes", () => {
    const state = signConnectorState("ws-1", "user-1");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(verifyConnectorState(state)).toBeNull();
  });

  it("rejects a state signed with a different secret", () => {
    const state = signConnectorState("ws-1", "user-1");
    process.env.AUTH_SECRET = "another_secret";
    expect(verifyConnectorState(state)).toBeNull();
  });

  it("rejects a signed payload that is missing fields instead of trusting the cast", () => {
    // A signature is not a schema. The previous version cast the parsed JSON,
    // so a payload with no `ts` gave NaN on the expiry comparison and passed.
    const encoded = Buffer.from(JSON.stringify({ workspaceId: "ws-1" })).toString("base64url");
    const state = `${encoded}.${signHmacHexFor("connector-oauth-state-v1", encoded)}`;
    expect(verifyConnectorState(state)).toBeNull();
  });

  // -- Cross-user binding and replay (docs/PR_REVIEW_2026-08-08.md §5.5) ----

  it("refuses a state completed by a different user than the one who started it", () => {
    // The account-linking attack: attacker's state, victim's browser. Without
    // this, the victim's provider tokens are filed under ws-attacker.
    const state = signConnectorState("ws-attacker", "user-attacker");
    expect(consumeConnectorState(state, "user-victim")).toBeNull();
  });

  it("accepts a state completed by the user who started it", () => {
    const state = signConnectorState("ws-1", "user-1");
    expect(consumeConnectorState(state, "user-1")).toMatchObject({ workspaceId: "ws-1" });
  });

  it("burns the nonce so a captured state cannot be used twice", () => {
    const state = signConnectorState("ws-1", "user-1");
    expect(consumeConnectorState(state, "user-1")).not.toBeNull();
    expect(consumeConnectorState(state, "user-1")).toBeNull();
  });

  it("does not burn the nonce when the state is rejected for another reason", () => {
    // A failed cross-user attempt must not lock the legitimate user out of
    // their own in-flight install.
    const state = signConnectorState("ws-1", "user-1");
    expect(consumeConnectorState(state, "user-attacker")).toBeNull();
    expect(consumeConnectorState(state, "user-1")).not.toBeNull();
  });

  // -- API-key identities cannot be session-bound --------------------------
  //
  // Found reviewing the first version of this change. `AuthContext.userId` is
  // an API KEY ID for bearer callers, so binding the callback to "Clerk session
  // must equal state.userId" would have refused every token-initiated install:
  // the two identifiers can never match. The state records which kind it is.

  it("does not enforce the session bind on an api-key state", () => {
    const state = signConnectorState("ws-1", "key_abc123", "api-key");
    // A Clerk user id will never equal a key id. Enforcing here would break a
    // legitimate install, not stop an attack.
    expect(consumeConnectorState(state, "user_clerk_1")).toMatchObject({
      workspaceId: "ws-1",
      identityKind: "api-key",
    });
  });

  it("still enforces the session bind on a clerk state", () => {
    const state = signConnectorState("ws-1", "user_clerk_1", "clerk");
    expect(consumeConnectorState(state, "user_clerk_2")).toBeNull();
  });

  it("still burns the nonce for an api-key state", () => {
    // Weaker binding must not mean weaker replay protection.
    const state = signConnectorState("ws-1", "key_abc123", "api-key");
    expect(consumeConnectorState(state)).not.toBeNull();
    expect(consumeConnectorState(state)).toBeNull();
  });

  it("treats a pre-upgrade state with no identityKind as unbindable, not invalid", () => {
    // States issued before identityKind existed are in flight for ten minutes
    // after deploy. Rejecting them would break installs mid-flow.
    const encoded = Buffer.from(
      JSON.stringify({ workspaceId: "ws-1", userId: "u1", nonce: "n1", ts: Date.now() })
    ).toString("base64url");
    const state = `${encoded}.${signHmacHexFor("connector-oauth-state-v1", encoded)}`;
    expect(consumeConnectorState(state, "someone-else")).toMatchObject({ workspaceId: "ws-1" });
  });

  it("defaults to a clerk identity when the caller does not say", () => {
    expect(verifyConnectorState(signConnectorState("ws-1", "u1"))?.identityKind).toBe("clerk");
  });

  it("issues a distinct nonce per install so parallel installs do not collide", () => {
    const a = signConnectorState("ws-1", "user-1");
    const b = signConnectorState("ws-1", "user-1");
    expect(a).not.toBe(b);
    expect(consumeConnectorState(a, "user-1")).not.toBeNull();
    expect(consumeConnectorState(b, "user-1")).not.toBeNull();
  });
});

describe("connector callback redirects", () => {
  it("falls back to localhost only under an explicit dev runtime", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    // NODE_ENV is readonly in the Next type surface; the runtime value is what
    // isExplicitDevRuntime reads, so assign through the index signature.
    (process.env as Record<string, string>).NODE_ENV = "test";
    expect(connectorAppUrl()).toBe("http://localhost:3000");
  });

  it("throws rather than redirecting customers to localhost in production", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string>).NODE_ENV = "production";
    expect(() => connectorAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL is required/);
  });

  it("strips a trailing slash from the configured URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    expect(connectorAppUrl()).toBe("https://app.example.com");
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("connector_token_refresh_failed")
    );
    errorSpy.mockRestore();
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

  // -- Concurrent refresh (docs/PR_REVIEW_2026-08-08.md §5.1) ---------------
  //
  // Microsoft and QuickBooks issue single-use refresh tokens. Two concurrent
  // refreshes therefore retire the token the winner just stored, and the
  // connector is bricked until the customer reconnects. These tests pin both
  // layers of the fix.

  it("performs exactly one refresh when several callers race for the same connector", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "single-use-refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockImplementation(async () => {
      // A real network round trip is what opens the race window.
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { access_token: "new-token", expires_in: 3600 };
    });

    const results = await Promise.all([
      getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken }),
      getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken }),
      getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken }),
    ]);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(upsertConnector).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r?.accessToken)).toEqual([
      "new-token",
      "new-token",
      "new-token",
    ]);
  });

  it("does not dedupe across different connectors or workspaces", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockResolvedValue({ access_token: "new-token", expires_in: 3600 });

    await Promise.all([
      getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken }),
      getValidConnectorAuth({ workspaceId: "ws-1", type: "quickbooks", refreshAccessToken }),
      getValidConnectorAuth({ workspaceId: "ws-2", type: "sharepoint", refreshAccessToken }),
    ]);

    expect(refreshAccessToken).toHaveBeenCalledTimes(3);
  });

  it("takes a per-connector advisory lock so other instances cannot refresh concurrently", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockResolvedValue({ access_token: "new-token", expires_in: 3600 });

    await getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken });

    expect(withAdvisoryLock).toHaveBeenCalledWith(
      "connector-refresh:ws-1:sharepoint",
      expect.any(Function)
    );
  });

  it("reuses a token another instance refreshed while this caller waited for the lock", async () => {
    // Queued behind the lock: by the time this caller gets in, the credentials
    // have already been replaced with a fresh token. Firing its own refresh
    // here is exactly what retires the winner's single-use token.
    getConnectorCredentials
      .mockResolvedValueOnce({
        accessToken: "stale-token",
        refreshToken: "refresh-token",
        obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
        expiresIn: 3600,
      })
      .mockResolvedValueOnce({
        accessToken: "token-from-the-other-instance",
        refreshToken: "rotated-refresh-token",
        obtainedAt: new Date().toISOString(),
        expiresIn: 3600,
      });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "quickbooks",
      refreshAccessToken,
    });

    expect(auth?.accessToken).toBe("token-from-the-other-instance");
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(upsertConnector).not.toHaveBeenCalled();
  });

  it("preserves the original installer instead of overwriting it with 'token-refresh'", async () => {
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      installedBy: "user_2abcXYZ",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockResolvedValue({ access_token: "new-token", expires_in: 3600 });

    await getValidConnectorAuth({ workspaceId: "ws-1", type: "sharepoint", refreshAccessToken });

    expect(upsertConnector).toHaveBeenCalledWith(
      expect.objectContaining({
        installedBy: "user_2abcXYZ",
        credentials: expect.objectContaining({
          lastRefreshedAt: expect.any(String),
        }),
      })
    );
  });

  it("bounds the provider call so the advisory lock cannot pin a connection", async () => {
    // The refresh runs inside a Postgres transaction that scopes the advisory
    // lock, which means an unbounded provider call holds a pooled connection
    // open for as long as the provider is slow. Found reviewing the first
    // version of this change.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    // Never settles. Without a timeout this test would hang, which is the
    // point: in production it would hang holding a database connection.
    refreshAccessToken.mockImplementation(() => new Promise(() => {}));

    vi.useFakeTimers();
    const pending = getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "sharepoint",
      refreshAccessToken,
    });
    await vi.advanceTimersByTimeAsync(11_000);

    await expect(pending).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("connector_token_refresh_failed"));
    errorSpy.mockRestore();
  });

  it("clears the in-flight entry after a failure so the next caller retries", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getConnectorCredentials.mockResolvedValue({
      accessToken: "stale-token",
      refreshToken: "refresh-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });
    refreshAccessToken.mockRejectedValueOnce(new Error("invalid_grant"));

    await expect(
      getValidConnectorAuth({ workspaceId: "ws-1", type: "slack", refreshAccessToken })
    ).resolves.toBeNull();

    // A stale in-flight promise would make every later caller inherit the
    // failure forever.
    refreshAccessToken.mockResolvedValueOnce({ access_token: "new-token", expires_in: 3600 });
    await expect(
      getValidConnectorAuth({ workspaceId: "ws-1", type: "slack", refreshAccessToken })
    ).resolves.toMatchObject({ accessToken: "new-token" });

    errorSpy.mockRestore();
  });

  it("reports an expired token that has no refresh token rather than failing silently", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    getConnectorCredentials.mockResolvedValue({
      accessToken: "expired-token",
      obtainedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expiresIn: 3600,
    });

    const auth = await getValidConnectorAuth({
      workspaceId: "ws-1",
      type: "slack",
      refreshAccessToken,
    });

    expect(auth?.accessToken).toBe("expired-token");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("connector_token_expired_unrefreshable")
    );
    warnSpy.mockRestore();
  });
});

describe("connector ingest helpers", () => {
  it("derives the tenant id from the workspace id", () => {
    expect(tenantIdForWorkspace("workspace-acme")).toBe("tenant-acme");
  });

  // -- Tenant derivation is a data-isolation boundary (§5.3) ---------------
  //
  // Was `workspaceId.replace("workspace-", "tenant-")`, which replaces the
  // first match ANYWHERE. These four inputs were all silently wrong, and the
  // previous suite pinned only the happy case above.

  it("refuses to guess a tenant id when the workspace id has no prefix", () => {
    expect(() => tenantIdForWorkspace("tenant-x")).toThrow(/expected an id starting with/);
    expect(() => tenantIdForWorkspace("")).toThrow();
  });

  it("does not rewrite an embedded 'workspace-' that is not the prefix", () => {
    // Previously became "acme-tenant-1" and "ws-tenant-workspace-2".
    expect(() => tenantIdForWorkspace("acme-workspace-1")).toThrow();
    expect(() => tenantIdForWorkspace("ws-workspace-workspace-2")).toThrow();
  });

  it("keeps a suffix that itself contains the prefix intact", () => {
    expect(tenantIdForWorkspace("workspace-workspace-2")).toBe("tenant-workspace-2");
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

  // -- Binary detection (docs/PR_REVIEW_2026-08-08.md §5.2) ----------------
  //
  // The old check was `text.includes("\0")` inside a try/catch. Buffer
  // .toString("utf-8") never throws, so the catch was dead, and any binary
  // format with no NUL byte was stored as mojibake — then hashed, embedded and
  // surfaced as citable evidence.

  it("detects a binary download that contains no NUL byte", () => {
    // JPEG magic + JFIF marker. No 0x00 anywhere.
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xc3, 0xb1, 0xfe,
    ]);
    expect(decodeDownloadedText(jpeg)).toBe(jpeg.toString("base64"));
  });

  it("trusts a declared binary content type over the byte heuristic", () => {
    const pdfish = Buffer.from("%PDF-1.7 mostly ascii header");
    expect(decodeDownloadedText(pdfish, "application/pdf")).toBe(
      pdfish.toString("base64")
    );
  });

  it("keeps text with an occasional replacement character as text", () => {
    // One bad byte in a long document must not tip the whole file to base64.
    const mostlyText = Buffer.concat([
      Buffer.from("a".repeat(1000)),
      Buffer.from([0xff]),
    ]);
    expect(decodeDownloadedText(mostlyText)).toContain("aaa");
  });

  it("treats JSON, XML and CSV content types as text", () => {
    const body = Buffer.from('{"ok":true}');
    expect(decodeDownloadedText(body, "application/json")).toBe('{"ok":true}');
    expect(decodeDownloadedText(Buffer.from("a,b"), "text/csv")).toBe("a,b");
  });

  it("aborts a download that exceeds the size cap", async () => {
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2048));
        controller.enqueue(new Uint8Array(2048));
        controller.close();
      },
    });
    await expect(readStreamToBuffer(oversized, 3000)).rejects.toThrow(/exceeds 3000 bytes/);
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
    expect(
      estimateExtractionConfidence("application/vnd.ms-excel", "google-drive")
    ).toBe(0.6);
    expect(
      estimateExtractionConfidence(
        "application/vnd.ms-powerpoint",
        "google-drive"
      )
    ).toBe(0.6);
    expect(
      estimateExtractionConfidence("application/vnd.ms-excel", "sharepoint")
    ).toBe(0.85);
    expect(
      estimateExtractionConfidence(
        "application/vnd.ms-powerpoint",
        "sharepoint"
      )
    ).toBe(0.85);
    expect(estimateExtractionConfidence("image/png")).toBe(0.6);
  });
});
