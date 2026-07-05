import { describe, expect, it, vi, beforeEach } from "vitest";
import { evaluateWorkspaceAccess, type WorkspaceStatusRecord } from "@/lib/data/repository";

describe("evaluateWorkspaceAccess (pure)", () => {
  const base: WorkspaceStatusRecord = {
    status: "active",
    trialEndsAt: null,
    suspendedAt: null,
    expiresAt: null,
  };

  it("allows an active workspace with no flags set", () => {
    expect(evaluateWorkspaceAccess(base)).toEqual({ blocked: false, reason: null });
  });

  it("blocks a cancelled workspace", () => {
    expect(evaluateWorkspaceAccess({ ...base, status: "cancelled" })).toEqual({
      blocked: true,
      reason: "cancelled",
    });
  });

  it("blocks a suspended workspace", () => {
    expect(evaluateWorkspaceAccess({ ...base, suspendedAt: new Date().toISOString() })).toEqual({
      blocked: true,
      reason: "suspended",
    });
  });

  it("blocks a workspace whose expiresAt is in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(evaluateWorkspaceAccess({ ...base, expiresAt: past })).toEqual({
      blocked: true,
      reason: "expired",
    });
  });

  it("does NOT block a workspace whose expiresAt is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(evaluateWorkspaceAccess({ ...base, expiresAt: future })).toEqual({
      blocked: false,
      reason: null,
    });
  });

  it("cancelled takes priority over an unrelated future expiresAt", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(evaluateWorkspaceAccess({ ...base, status: "cancelled", expiresAt: future })).toEqual({
      blocked: true,
      reason: "cancelled",
    });
  });
});

// ---------------------------------------------------------------------------
// requireScope gate behaviour — mocks Clerk session auth + repository
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetWorkspaceStatus = vi.fn();
vi.mock("@/lib/data/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/repository")>();
  return {
    ...actual,
    repository: {
      getWorkspaceStatus: (...args: unknown[]) => mockGetWorkspaceStatus(...args),
    },
  };
});

describe("requireScope workspace access gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Each case uses a distinct orgId so the 30s in-process access cache in
  // api-auth.ts (keyed by workspaceId) can't leak a result between tests.

  it("blocks a suspended workspace with 402", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1", orgId: "org-suspended" });
    mockGetWorkspaceStatus.mockResolvedValue({
      status: "active",
      trialEndsAt: null,
      suspendedAt: new Date().toISOString(),
      expiresAt: null,
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "read:workspace");

    expect(ctx).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(402);
  });

  it("allows a suspended workspace through when allowWhenBlocked is set", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1", orgId: "org-suspended-bypass" });
    mockGetWorkspaceStatus.mockResolvedValue({
      status: "active",
      trialEndsAt: null,
      suspendedAt: new Date().toISOString(),
      expiresAt: null,
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "read:workspace", {
      allowWhenBlocked: true,
    });

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("org-suspended-bypass");
  });

  it("allows an active, unblocked workspace through", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1", orgId: "org-active" });
    mockGetWorkspaceStatus.mockResolvedValue({
      status: "active",
      trialEndsAt: null,
      suspendedAt: null,
      expiresAt: null,
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test2"), "read:workspace");

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("org-active");
  });

  it("fails open (does not block) if the status lookup errors", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1", orgId: "org-lookup-error" });
    mockGetWorkspaceStatus.mockRejectedValue(new Error("db unavailable"));

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test3"), "read:workspace");

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("org-lookup-error");
  });
});
