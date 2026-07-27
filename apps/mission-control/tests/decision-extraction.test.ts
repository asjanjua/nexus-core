import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentOutput } from "@/lib/contracts";

const mocks = vi.hoisted(() => ({
  listAgentOutputs: vi.fn(),
  ask: vi.fn()
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    listAgentOutputs: mocks.listAgentOutputs
  }
}));

vi.mock("@/lib/services/llm", () => ({
  ask: mocks.ask
}));

const { proposeDecisionsFromAgentOutputs } = await import("@/lib/services/decision-extraction");

function output(overrides: Partial<AgentOutput> = {}): AgentOutput {
  return {
    id: "out-1",
    workspaceId: "workspace-acme",
    agentId: "risk_sentinel",
    agentVersion: 1,
    roleKey: "cro",
    content: "A decision is needed on the vendor contract renewal before the audit closes.",
    inputSummary: "3 evidence records",
    evidenceRefs: ["ev-1"],
    confidence: 0.82,
    outputVersion: 1,
    isActive: true,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAgentOutputs.mockResolvedValue([output()]);
});

describe("proposeDecisionsFromAgentOutputs", () => {
  it("clamps the lookback window and result limit passed to the repository", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify({ decisions: [] }));

    await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme", days: 900, limit: 500 });
    expect(mocks.listAgentOutputs.mock.calls[0][0]).toMatchObject({ workspaceId: "workspace-acme", limit: 25 });
    const wideSince = Date.parse(mocks.listAgentOutputs.mock.calls[0][0].since);
    expect(Date.now() - wideSince).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);

    await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme", days: 0, limit: 0 });
    expect(mocks.listAgentOutputs.mock.calls[1][0]).toMatchObject({ limit: 1 });
  });

  it("returns nothing when no active outputs exist", async () => {
    mocks.listAgentOutputs.mockResolvedValue([output({ isActive: false })]);

    await expect(proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" })).resolves.toEqual([]);
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("parses fenced JSON and inherits evidence refs from the source output", async () => {
    mocks.ask.mockResolvedValue(
      "```json\n" +
        JSON.stringify({
          decisions: [
            {
              title: "Approve the vendor contract renewal",
              owner: "CRO",
              rationale: "The audit closes in two weeks.",
              priority: "high",
              sourceOutputId: "out-1",
              evidenceRefs: []
            }
          ]
        }) +
        "\n```"
    );

    const decisions = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      title: "Approve the vendor contract renewal",
      owner: "CRO",
      priority: "high",
      evidenceRefs: ["ev-1"],
      actions: []
    });
  });

  it("keeps evidence refs the model supplied", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify({
        decisions: [
          {
            title: "Approve the vendor contract renewal",
            owner: "CRO",
            rationale: "Audit deadline.",
            sourceOutputId: "out-1",
            evidenceRefs: ["ev-9"]
          }
        ]
      })
    );

    const [decision] = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decision.evidenceRefs).toEqual(["ev-9"]);
    expect(decision.priority).toBe("medium");
  });

  it("drops decisions that cite an output outside the fetched window", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify({
        decisions: [
          { title: "Valid", owner: "CRO", rationale: "In window.", sourceOutputId: "out-1" },
          { title: "Hallucinated", owner: "CRO", rationale: "Unknown output.", sourceOutputId: "out-404" }
        ]
      })
    );

    const decisions = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decisions.map((decision) => decision.title)).toEqual(["Valid"]);
  });

  it("falls back to heuristic extraction when the LLM response fails schema validation", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify({ decisions: [{ owner: "CRO" }] }));

    const decisions = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      owner: "Unassigned",
      priority: "medium",
      sourceOutputId: "out-1",
      evidenceRefs: ["ev-1"]
    });
    expect(decisions[0].actions[0]).toMatchObject({ owner: "Unassigned", dueDate: null, isBlocker: false });
  });

  it("falls back to heuristic extraction when the LLM throws", async () => {
    mocks.ask.mockRejectedValue(new Error("llm down"));

    const decisions = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decisions[0].title).toBe("A decision is needed on the vendor contract renewal before the audit closes.");
  });

  it("raises fallback priority and flags blockers for urgent outputs", async () => {
    mocks.ask.mockRejectedValue(new Error("llm down"));
    mocks.listAgentOutputs.mockResolvedValue([
      output({ id: "out-urgent", content: "Regulator escalation is a blocker for the licence decision." })
    ]);

    const [decision] = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decision.priority).toBe("high");
    expect(decision.actions[0].isBlocker).toBe(true);
  });

  it("ignores outputs without decision language and caps the fallback at four", async () => {
    mocks.ask.mockRejectedValue(new Error("llm down"));
    mocks.listAgentOutputs.mockResolvedValue([
      output({ id: "out-noise", content: "Weekly throughput remained flat." }),
      ...Array.from({ length: 6 }, (_, index) =>
        output({ id: `out-${index}`, content: "The team must decide on the staffing plan." })
      )
    ]);

    const decisions = await proposeDecisionsFromAgentOutputs({ workspaceId: "workspace-acme" });

    expect(decisions).toHaveLength(4);
    expect(decisions.every((decision) => decision.sourceOutputId !== "out-noise")).toBe(true);
  });
});
