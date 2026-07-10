import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";

describe("agent outputs and rollback", () => {
  it("keeps output history and rolls back without deleting versions", async () => {
    const workspaceId = `workspace-u3-${Date.now()}`;
    const first = await repository.saveAgentOutput({
      workspaceId,
      agentId: "risk_agent",
      agentVersion: 1,
      roleKey: "ceo",
      content: "First risk brief.",
      inputSummary: "First prompt summary",
      evidenceRefs: ["ev-001"],
      confidence: 0.8
    });
    const second = await repository.saveAgentOutput({
      workspaceId,
      agentId: "risk_agent",
      agentVersion: 1,
      roleKey: "ceo",
      content: "Second risk brief.",
      inputSummary: "Second prompt summary",
      evidenceRefs: ["ev-001", "ev-002"],
      confidence: 0.9
    });

    let outputs = await repository.listAgentOutputs({ workspaceId, agentId: "risk_agent", limit: 10 });
    expect(outputs).toHaveLength(2);
    expect(outputs.find((output) => output.id === first.id)?.isActive).toBe(false);
    expect(outputs.find((output) => output.id === second.id)?.isActive).toBe(true);

    const rolledBack = await repository.rollbackAgentOutput(workspaceId, first.id, "reviewer", "Prefer prior wording");
    expect(rolledBack?.id).toBe(first.id);

    outputs = await repository.listAgentOutputs({ workspaceId, agentId: "risk_agent", limit: 10 });
    expect(outputs).toHaveLength(2);
    expect(outputs.find((output) => output.id === first.id)?.isActive).toBe(true);
    expect(outputs.find((output) => output.id === second.id)?.isActive).toBe(false);

    const events = await repository.getAuditEvents(workspaceId, 10);
    expect(events.some((event) => event.type === "agent_output_created")).toBe(true);
    expect(events.some((event) => event.type === "agent_output_rolled_back")).toBe(true);
  });
});
