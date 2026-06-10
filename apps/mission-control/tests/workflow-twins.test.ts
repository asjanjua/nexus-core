import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";
import { buildWorkflowTwinRunInput } from "@/lib/services/workflow-twins";
import { store } from "@/lib/data/store";

describe("workflow twin primitives", () => {
  it("creates workflow twins and writes an audit event", async () => {
    const workspaceId = `workspace-workflow-${Date.now()}`;
    const before = store.auditEvents.length;

    const twin = await repository.createWorkflowTwin(
      workspaceId,
      {
        type: "decision_action",
        name: "Decision & Action Twin",
        status: "active",
        config: { cadence: "weekly" },
        owner: "ceo"
      },
      "tester"
    );

    expect(twin.workspaceId).toBe(workspaceId);
    expect(twin.type).toBe("decision_action");
    expect(await repository.getWorkflowTwin(workspaceId, twin.id)).toMatchObject({ id: twin.id });
    expect((await repository.listWorkflowTwins(workspaceId)).map((item) => item.id)).toContain(twin.id);
    expect(store.auditEvents.length).toBeGreaterThan(before);
  });

  it("creates workflow twin run history with evidence refs", async () => {
    const workspaceId = `workspace-workflow-run-${Date.now()}`;
    const twin = await repository.createWorkflowTwin(
      workspaceId,
      {
        type: "ops_review",
        name: "Ops Review Twin",
        status: "active",
        config: {},
        owner: "coo"
      },
      "tester"
    );

    const run = await repository.createWorkflowTwinRun(
      workspaceId,
      twin,
      {
        evidenceRefs: ["ev-001"],
        generatedOutputRefs: ["out-001"],
        confidence: 0.81,
        status: "generated",
        summary: "Ops review generated.",
        payload: { blockers: 1 }
      },
      "tester"
    );

    expect(run.twinId).toBe(twin.id);
    expect(run.twinType).toBe("ops_review");
    expect(run.evidenceRefs).toEqual(["ev-001"]);
    expect((await repository.listWorkflowTwinRuns(workspaceId, twin.id))[0]?.id).toBe(run.id);
  });

  it("builds deterministic run input for decision and ops twins", async () => {
    const decisionTwin = {
      id: "wt-decision",
      workspaceId: "workspace-demo",
      type: "decision_action" as const,
      name: "Decision & Action Twin",
      status: "active" as const,
      config: {},
      owner: "ceo",
      createdBy: "tester",
      createdAt: new Date().toISOString(),
      updatedBy: "tester",
      updatedAt: new Date().toISOString()
    };
    const opsTwin = { ...decisionTwin, id: "wt-ops", type: "ops_review" as const, name: "Ops Review Twin" };

    const decisionRun = await buildWorkflowTwinRunInput(decisionTwin, "workspace-demo");
    const opsRun = await buildWorkflowTwinRunInput(opsTwin, "workspace-demo");

    expect(decisionRun.summary).toContain("Decision & Action");
    expect(opsRun.summary).toContain("Ops review");
    expect(decisionRun.payload).toHaveProperty("openDecisions");
    expect(opsRun.payload).toHaveProperty("blockers");
  });
});
