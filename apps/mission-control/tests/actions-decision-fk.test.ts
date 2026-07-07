/**
 * Write-side sweep (2026-07-07): POST /api/actions must not attach an action to
 * a decisionId that is not in the caller's workspace. Integrity hardening — the
 * action is always created in ctx.workspaceId, so this prevents dangling or
 * cross-tenant parent references, not a data leak.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  requireScope: vi.fn(),
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    listDecisions: vi.fn(),
    createAction: vi.fn().mockImplementation(async (_ws, input) => ({ id: "act-1", ...input })),
  },
}));

import { POST } from "@/app/api/actions/route";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const mockRequireScope = vi.mocked(requireScope);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireScope.mockResolvedValue({
    ctx: { workspaceId: "workspace-alice", userId: "alice", scopes: ["*"], authType: "session" },
    error: null,
  } as Awaited<ReturnType<typeof requireScope>>);
});

function postAction(decisionId: string) {
  return POST(
    new Request("http://localhost/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId, actionText: "Do the thing", owner: "alice" }),
    })
  );
}

describe("POST /api/actions decision FK gate", () => {
  it("rejects an action whose decisionId is not in the caller's workspace", async () => {
    vi.mocked(repository.listDecisions).mockResolvedValue([{ id: "dec-owned" }] as never);

    const res = await postAction("dec-foreign");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "decision_not_found" });
    expect(repository.createAction).not.toHaveBeenCalled();
  });

  it("creates the action when the decision belongs to the workspace", async () => {
    vi.mocked(repository.listDecisions).mockResolvedValue([{ id: "dec-owned" }] as never);

    const res = await postAction("dec-owned");

    expect(res.status).toBe(201);
    expect(repository.createAction).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({ decisionId: "dec-owned" }),
      "alice"
    );
  });
});
