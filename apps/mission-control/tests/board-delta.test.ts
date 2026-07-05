import { describe, expect, it, vi } from "vitest";
import { questionsForRole, synthesiseBoardDelta } from "@/lib/services/synthesis";
import { repository } from "@/lib/data/repository";

vi.mock("@/lib/services/llm", () => ({
  ask: vi.fn(async () => "Mock brief answer grounded in the pack."),
}));

describe("questionsForRole('board')", () => {
  it("returns the 5 director/board question set", () => {
    const qs = questionsForRole("board");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("board needs to know");
  });
});

describe("synthesiseBoardDelta", () => {
  it("first call for a workspace has no previous brief", async () => {
    const workspaceId = `workspace-board-${Date.now()}`;

    const result = await synthesiseBoardDelta(workspaceId, "Q2 2026 Board Pack");

    expect(result.hasPrevious).toBe(false);
    expect(result.delta).toBeNull();
    expect(result.brief.role).toBe("board");
    expect(result.brief.workspaceId).toBe(workspaceId);
  });

  it("second call for the same board produces a delta against the first", async () => {
    const workspaceId = `workspace-board-${Date.now()}-2`;
    const boardId = "main-board"; // stable board identifier, not a per-quarter label

    const first = await synthesiseBoardDelta(workspaceId, boardId);
    expect(first.hasPrevious).toBe(false);

    const second = await synthesiseBoardDelta(workspaceId, boardId);
    expect(second.hasPrevious).toBe(true);
    expect(second.delta).toBe("Mock brief answer grounded in the pack.");

    // Confirms the versioning chain via saveAgentOutput: two persisted
    // outputs for the shared agentId + department, most recent is active.
    const outputs = await repository.listAgentOutputs({
      workspaceId,
      agentId: "synthesis_board",
      department: boardId,
      limit: 5,
    });
    expect(outputs.length).toBeGreaterThanOrEqual(2);
  });

  it("two different boards in the same workspace do not collide", async () => {
    const workspaceId = `workspace-board-${Date.now()}-3`;

    // Board A's first brief
    const boardA = await synthesiseBoardDelta(workspaceId, "board-a");
    expect(boardA.hasPrevious).toBe(false);

    // Board B's first brief — must NOT see board A's brief as "previous",
    // even though both share the same workspace and role ("board").
    const boardB = await synthesiseBoardDelta(workspaceId, "board-b");
    expect(boardB.hasPrevious).toBe(false);

    // Board A's second brief still correctly finds its own prior brief.
    const boardAAgain = await synthesiseBoardDelta(workspaceId, "board-a");
    expect(boardAAgain.hasPrevious).toBe(true);
  });
});
