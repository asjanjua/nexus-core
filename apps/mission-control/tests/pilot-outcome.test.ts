import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";

describe("pilot outcome record (migration 0036)", () => {
  it("returns null before any decision is recorded", async () => {
    const ws = `ws-outcome-${Date.now()}-a`;
    expect(await repository.getPilotOutcome(ws, "Merchant Onboarding Risk Review")).toBeNull();
  });

  it("records an expand/hold/stop decision and reads it back", async () => {
    const ws = `ws-outcome-${Date.now()}-b`;
    const wf = "Merchant Onboarding Risk Review";
    const recorded = await repository.recordPilotDecision({
      id: `po_test_${Date.now()}`,
      workspaceId: ws,
      workflowName: wf,
      status: "expand",
      note: "Sponsor happy, scale to two more teams",
      decidedBy: "user_sponsor",
    });
    expect(recorded.status).toBe("expand");
    expect(recorded.decidedBy).toBe("user_sponsor");
    expect(recorded.decidedAt).toBeTruthy();

    const fetched = await repository.getPilotOutcome(ws, wf);
    expect(fetched?.status).toBe("expand");
    expect(fetched?.note).toContain("scale to two more teams");
  });

  it("upserts: a second decision updates the same record, not a duplicate", async () => {
    const ws = `ws-outcome-${Date.now()}-c`;
    const wf = "Merchant Onboarding Risk Review";
    const first = await repository.recordPilotDecision({
      id: `po_first_${Date.now()}`,
      workspaceId: ws,
      workflowName: wf,
      status: "hold",
      decidedBy: "user_a",
    });
    const second = await repository.recordPilotDecision({
      id: `po_second_${Date.now()}`,
      workspaceId: ws,
      workflowName: wf,
      status: "stop",
      note: "Regulatory blocker",
      decidedBy: "user_b",
    });
    expect(second.id).toBe(first.id); // same record
    const current = await repository.getPilotOutcome(ws, wf);
    expect(current?.status).toBe("stop");
    expect(current?.decidedBy).toBe("user_b");
  });

  it("keeps outcomes separate per workflow in the same workspace", async () => {
    const ws = `ws-outcome-${Date.now()}-d`;
    await repository.recordPilotDecision({
      id: `po_x_${Date.now()}`,
      workspaceId: ws,
      workflowName: "Workflow X",
      status: "expand",
      decidedBy: "user_a",
    });
    await repository.recordPilotDecision({
      id: `po_y_${Date.now()}`,
      workspaceId: ws,
      workflowName: "Workflow Y",
      status: "stop",
      decidedBy: "user_a",
    });
    expect((await repository.getPilotOutcome(ws, "Workflow X"))?.status).toBe("expand");
    expect((await repository.getPilotOutcome(ws, "Workflow Y"))?.status).toBe("stop");
  });
});
