/**
 * Regression: caller-supplied workspaceId must never override the authenticated
 * workspace. Covers the routes found in the 2026-07-06 auth-bypass sweep
 * (docs/SECURITY_REVIEW.md): recommendations, ingestion/status, pilot/paperwork,
 * settings/workspace. Companion to tests/strategy-profile-authz.test.ts.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");
  return {
    ...actual,
    resolveAuth: vi.fn(),
    requireScope: vi.fn(),
  };
});

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getRecommendations: vi.fn().mockResolvedValue([]),
    getEvidenceForWorkspace: vi.fn().mockResolvedValue([]),
    getStrategyProfile: vi.fn().mockResolvedValue({ selectedWorkflow: null }),
    getWorkspaceSettings: vi.fn().mockResolvedValue({ name: "Alice Co" }),
    listWorkflowTwins: vi.fn().mockResolvedValue([]),
    updateWorkspaceSettings: vi.fn().mockImplementation(async (_ws: string, patch: unknown) => patch),
  },
}));

import { resolveAuth, requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const mockResolveAuth = vi.mocked(resolveAuth);
const mockRequireScope = vi.mocked(requireScope);

const aliceSession = {
  workspaceId: "workspace-alice",
  userId: "alice",
  scopes: ["*"],
  authType: "session" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveAuth.mockResolvedValue(aliceSession as Awaited<ReturnType<typeof resolveAuth>>);
  mockRequireScope.mockResolvedValue({ ctx: aliceSession, error: null } as Awaited<ReturnType<typeof requireScope>>);
});

describe("recommendations authz", () => {
  it("ignores ?workspaceId and reads the caller's workspace", async () => {
    const { GET } = await import("@/app/api/recommendations/route");
    await GET(new Request("http://localhost/api/recommendations?workspaceId=workspace-victim"));
    expect(repository.getRecommendations).toHaveBeenCalledWith("workspace-alice");
  });
});

describe("ingestion status authz", () => {
  it("ignores ?workspaceId even for the evidence read", async () => {
    const { GET } = await import("@/app/api/ingestion/status/route");
    await GET(new Request("http://localhost/api/ingestion/status?workspaceId=workspace-victim"));
    expect(repository.getEvidenceForWorkspace).toHaveBeenCalledWith("workspace-alice");
  });
});

describe("pilot paperwork authz", () => {
  it("ignores ?workspaceId and reads the caller's workspace", async () => {
    const { GET } = await import("@/app/api/pilot/paperwork/route");
    await GET(new Request("http://localhost/api/pilot/paperwork?workspaceId=workspace-victim"));
    expect(repository.getStrategyProfile).toHaveBeenCalledWith("workspace-alice");
    expect(repository.getWorkspaceSettings).toHaveBeenCalledWith("workspace-alice");
  });

  it("enforces the read:admin scope", async () => {
    const { GET } = await import("@/app/api/pilot/paperwork/route");
    await GET(new Request("http://localhost/api/pilot/paperwork"));
    expect(mockRequireScope).toHaveBeenCalledWith(expect.any(Request), "read:admin");
  });
});

describe("settings workspace authz", () => {
  it("GET ignores ?workspaceId", async () => {
    const { GET } = await import("@/app/api/settings/workspace/route");
    await GET(new Request("http://localhost/api/settings/workspace?workspaceId=workspace-victim"));
    expect(mockRequireScope).toHaveBeenCalledWith(expect.any(Request), "read:settings");
    expect(repository.getWorkspaceSettings).toHaveBeenCalledWith("workspace-alice");
  });

  it("PATCH ignores a workspaceId in the body and writes the caller's workspace", async () => {
    const { PATCH } = await import("@/app/api/settings/workspace/route");
    await PATCH(
      new Request("http://localhost/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: "workspace-victim", name: "Hijacked" }),
      })
    );
    expect(mockRequireScope).toHaveBeenCalledWith(expect.any(Request), "write:settings");
    expect(repository.updateWorkspaceSettings).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({ name: "Hijacked" })
    );
    // The stripped workspaceId must not reach the repository patch.
    const patchArg = vi.mocked(repository.updateWorkspaceSettings).mock.calls[0][1] as Record<string, unknown>;
    expect(patchArg.workspaceId).toBeUndefined();
  });
});
