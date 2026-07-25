/**
 * Regression: revoking an agent key must invalidate tokens already issued
 * from it.
 *
 * decodeBearerToken() verifies only the HMAC and exp, so before this fix a
 * revoked key kept working for up to the token's full 1h TTL. resolveAuth()
 * now checks the key's usability behind a short TTL cache.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null, orgId: null, orgRole: null }),
}));

const mockIsAgentKeyUsable = vi.fn();
vi.mock("@/lib/data/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/repository")>();
  return {
    ...actual,
    repository: {
      isAgentKeyUsable: (...args: unknown[]) => mockIsAgentKeyUsable(...args),
      getWorkspaceStatus: vi.fn().mockResolvedValue(null),
    },
  };
});

import { signToken } from "@/lib/tokens";

function bearerRequest(keyId: string) {
  const token = signToken({
    workspaceId: "workspace-alpha",
    keyId,
    scopes: ["read:evidence"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return new Request("https://x/api/test", {
    headers: { authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "test-secret-for-agent-key-revocation-tests";
});

describe("agent key revocation", () => {
  it("resolves a token whose key is still usable", async () => {
    mockIsAgentKeyUsable.mockResolvedValue(true);

    const { resolveAuth } = await import("@/lib/api-auth");
    const ctx = await resolveAuth(bearerRequest("key-live"));

    expect(ctx).not.toBeNull();
    expect(ctx?.workspaceId).toBe("workspace-alpha");
    expect(ctx?.authType).toBe("bearer");
  });

  it("rejects a structurally valid, unexpired token whose key was revoked", async () => {
    mockIsAgentKeyUsable.mockResolvedValue(false);

    const { resolveAuth } = await import("@/lib/api-auth");
    const ctx = await resolveAuth(bearerRequest("key-revoked"));

    expect(ctx).toBeNull();
  });

  it("caches the lookup rather than hitting the repository per request", async () => {
    mockIsAgentKeyUsable.mockResolvedValue(true);

    const { resolveAuth } = await import("@/lib/api-auth");
    await resolveAuth(bearerRequest("key-cached"));
    await resolveAuth(bearerRequest("key-cached"));
    await resolveAuth(bearerRequest("key-cached"));

    expect(mockIsAgentKeyUsable).toHaveBeenCalledTimes(1);
  });

  it("re-checks immediately once the key's cache entry is invalidated", async () => {
    mockIsAgentKeyUsable.mockResolvedValue(true);

    const { resolveAuth, invalidateAgentKeyCache } = await import("@/lib/api-auth");
    expect(await resolveAuth(bearerRequest("key-invalidated"))).not.toBeNull();

    // What DELETE /api/agent-keys/:id does after revoking.
    mockIsAgentKeyUsable.mockResolvedValue(false);
    invalidateAgentKeyCache("key-invalidated");

    expect(await resolveAuth(bearerRequest("key-invalidated"))).toBeNull();
  });
});
