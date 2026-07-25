/**
 * Regression: admin-only scopes must require a Clerk org-admin role.
 *
 * Before this fix resolveAuth() handed every Clerk session wildcard scope, so
 * any ordinary org member passed requireScope(request, "admin") and could
 * purge the workspace, revoke agent keys, or install connectors.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/data/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/repository")>();
  return {
    ...actual,
    repository: {
      // Unblocked workspace: isolates this suite to the role gate.
      getWorkspaceStatus: vi.fn().mockResolvedValue({
        status: "active",
        trialEndsAt: null,
        suspendedAt: null,
        expiresAt: null,
      }),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// Each case uses a distinct orgId so the 30s access cache in api-auth.ts
// (keyed by workspaceId) cannot leak a result between tests.

describe("org role authorization", () => {
  it("denies an ordinary org member an admin-only scope", async () => {
    mockAuth.mockResolvedValue({
      userId: "user-member",
      orgId: "org-rbac-member",
      orgRole: "org:member",
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "admin");

    expect(ctx).toBeNull();
    expect(error!.status).toBe(403);
    expect(await error!.json()).toMatchObject({ error: "admin_role_required" });
  });

  it("allows an org admin an admin-only scope", async () => {
    mockAuth.mockResolvedValue({
      userId: "user-admin",
      orgId: "org-rbac-admin",
      orgRole: "org:admin",
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "admin");

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("org-rbac-admin");
    expect(ctx?.isOrgAdmin).toBe(true);
  });

  it("still allows an ordinary org member non-admin scopes", async () => {
    mockAuth.mockResolvedValue({
      userId: "user-member",
      orgId: "org-rbac-member-read",
      orgRole: "org:member",
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "read:evidence");

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("org-rbac-member-read");
    expect(ctx?.isOrgAdmin).toBe(false);
  });

  it("treats an org-less personal workspace as its own admin", async () => {
    // The user is the only member of their personal workspace, so gating them
    // out of admin scopes would lock them out of their own settings.
    mockAuth.mockResolvedValue({
      userId: "user-solo",
      orgId: null,
      orgRole: null,
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "admin");

    expect(error).toBeNull();
    expect(ctx?.workspaceId).toBe("user-solo");
    expect(ctx?.isOrgAdmin).toBe(true);
  });

  it("denies a custom non-admin org role an admin-only scope", async () => {
    mockAuth.mockResolvedValue({
      userId: "user-custom",
      orgId: "org-rbac-custom",
      orgRole: "org:analyst",
    });

    const { requireScope } = await import("@/lib/api-auth");
    const { ctx, error } = await requireScope(new Request("https://x/api/test"), "admin");

    expect(ctx).toBeNull();
    expect(error!.status).toBe(403);
  });
});
