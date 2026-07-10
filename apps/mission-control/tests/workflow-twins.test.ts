import { afterEach, describe, expect, it, vi } from "vitest";
import { repository } from "@/lib/data/repository";
import { buildWorkflowTwinRunInput, computeSignalStrength } from "@/lib/services/workflow-twins";
import { store } from "@/lib/data/store";
import type { StrategyProfile } from "@/lib/contracts";

// Most scorer tests stub getStrategyProfile directly so the lane/gate input is
// deterministic even when the demo/no-DB fallback store is also available.
function stubStrategyProfile(partial: Partial<StrategyProfile> | null) {
  vi.spyOn(repository, "getStrategyProfile").mockResolvedValue(
    partial === null
      ? null
      : ({
          id: "sp_test", workspaceId: "ws", buyerLane: "evaluator",
          role: null, sector: null, companySize: null, priority: "medium",
          sponsorName: null, sponsorEmail: null, reviewerName: null, reviewerEmail: null,
          governancePosture: "standard", selectedWorkflow: null,
	          readinessScores: {}, readinessBand: null, externalRef: null,
	          initialLane: null, laneChangeReason: null, laneConfidence: null,
	          laneChangedBy: null, laneChangedAt: null,
	          pilotReady: false, pilotGates: [],
	          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
	          ...partial,
	        } as StrategyProfile)
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("scores candidate workflow twins with a recommended first workflow", async () => {
    const scorerTwin = {
      id: "wt-scorer",
      workspaceId: "workspace-demo",
      type: "workflow_scorer" as const,
      name: "Workflow Twin Scorer",
      status: "active" as const,
      config: {},
      owner: "strategy",
      createdBy: "tester",
      createdAt: new Date().toISOString(),
      updatedBy: "tester",
      updatedAt: new Date().toISOString()
    };

    const run = await buildWorkflowTwinRunInput(scorerTwin, "workspace-demo");
    const candidates = run.payload.candidates as Array<{ label: string; score: number; recommended?: boolean }>;

    expect(run.summary).toContain("Workflow scorer recommends");
    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.some((candidate) => candidate.recommended)).toBe(true);
    expect(candidates[0]?.score).toBeGreaterThanOrEqual(candidates[candidates.length - 1]?.score ?? 0);
    expect(run.payload).toHaveProperty("shadowPlan");
  });

  it("marks autonomous/legal workflows as hard-gated and never recommends them", async () => {
    const scorerTwin = {
      id: "wt-scorer-hg",
      workspaceId: "workspace-demo",
      type: "workflow_scorer" as const,
      name: "Workflow Twin Scorer",
      status: "active" as const,
      config: {},
      owner: "strategy",
      createdBy: "tester",
      createdAt: new Date().toISOString(),
      updatedBy: "tester",
      updatedAt: new Date().toISOString()
    };

    const run = await buildWorkflowTwinRunInput(scorerTwin, "workspace-demo");
    const candidates = run.payload.candidates as Array<{ type: string; hardGate: string | null; status: string; recommended: boolean }>;

    const regulatory = candidates.find((c) => c.type === "regulatory_response");
    const agreement = candidates.find((c) => c.type === "agreement_review");
    expect(regulatory?.hardGate).toBeTruthy();
    expect(regulatory?.status).toBe("not_first_pilot");
    expect(agreement?.hardGate).toBeTruthy();
    // A hard-gated candidate is never the recommendation.
    const recommended = candidates.find((c) => c.recommended);
    expect(recommended?.hardGate).toBeNull();
  });

	  it("blocks pilot readiness until sponsor and reviewer gates clear", async () => {
	    const workspaceId = `workspace-gates-${Date.now()}`;
	    const readinessSpy = vi.spyOn(repository, "setPilotReadiness");
	    const scorerTwin = await repository.createWorkflowTwin(
	      workspaceId,
      { type: "workflow_scorer", name: "Workflow Twin Scorer", status: "active", config: {}, owner: "strategy" },
      "tester"
    );

    // No strategy profile: all bridgeable gates blocked, not pilot-ready.
    stubStrategyProfile(null);
    const blockedRun = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);
    expect(blockedRun.payload.pilotReady).toBe(false);
    const gates = blockedRun.payload.pilotGates as Array<{ key: string; blocked: boolean }>;
    expect(gates.find((g) => g.key === "sponsor_named")?.blocked).toBe(true);
    expect(gates.find((g) => g.key === "reviewer_named")?.blocked).toBe(true);

    // Sponsor named + a free-text reviewer name. The reviewer gate now
    // requires an identity-bound reviewer SEAT, not a name, so it stays
    // blocked until a seat is accepted (reviewer-seat slice 3).
    stubStrategyProfile({ buyerLane: "business_advisory", sponsorName: "A. Sponsor", reviewerName: "R. Reviewer" });
    const stillBlocked = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);
    const gates2 = stillBlocked.payload.pilotGates as Array<{ key: string; blocked: boolean }>;
    expect(gates2.find((g) => g.key === "sponsor_named")?.blocked).toBe(false);
	    expect(gates2.find((g) => g.key === "reviewer_named")?.blocked).toBe(true);
	    expect(gates2.find((g) => g.key === "evidence_available")?.blocked).toBe(true);
	    expect(stillBlocked.payload.pilotReady).toBe(false);
	    expect(readinessSpy).toHaveBeenLastCalledWith(
	      workspaceId,
	      false,
	      expect.arrayContaining([
	        expect.objectContaining({ key: "reviewer_named", blocked: true }),
	        expect.objectContaining({ key: "evidence_available", blocked: true }),
	      ])
	    );

	    // Accept an identity-bound reviewer seat for this workspace: the
	    // reviewer gate now clears even though evidence is still missing.
	    const { createHash, randomBytes } = await import("crypto");
	    const inviteCode = randomBytes(24).toString("base64url");
	    const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");
	    await repository.createReviewerSeat({
	      id: `rs_gate_${Date.now()}`,
	      workspaceId,
	      email: "reviewer@example.com",
	      name: "R. Reviewer",
	      inviteCodeHash,
	      invitedBy: "user_sponsor",
	      expiresAt: new Date(Date.now() + 86_400_000),
	    });
	    await repository.acceptReviewerSeat(inviteCodeHash, "user_reviewer_gate");
	    const reviewerBound = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);
	    const gates3 = reviewerBound.payload.pilotGates as Array<{ key: string; blocked: boolean }>;
	    expect(gates3.find((g) => g.key === "reviewer_named")?.blocked).toBe(false);
	    expect(gates3.find((g) => g.key === "evidence_available")?.blocked).toBe(true);
	    expect(reviewerBound.payload.pilotReady).toBe(false);
	  });

  it("applies lane-fit boost from the strategy profile buyer lane", async () => {
    const workspaceId = `workspace-lane-${Date.now()}`;
    const scorerTwin = await repository.createWorkflowTwin(
      workspaceId,
      { type: "workflow_scorer", name: "Workflow Twin Scorer", status: "active", config: {}, owner: "strategy" },
      "tester"
    );

    stubStrategyProfile({ buyerLane: "regulated_enterprise" });
    const regRun = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);
    stubStrategyProfile({ buyerLane: "sme_self_serve" });
    const smeRun = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);

    const riskInReg = (regRun.payload.candidates as Array<{ type: string; score: number }>).find((c) => c.type === "risk_review")!;
    const riskInSme = (smeRun.payload.candidates as Array<{ type: string; score: number }>).find((c) => c.type === "risk_review")!;
    // risk_review is a lane-fit match for regulated_enterprise but not for sme.
    expect(riskInReg.score).toBeGreaterThan(riskInSme.score);
  });

  it("labels scorer signal strength and never lets it gate pilot readiness", async () => {
    // Pure threshold checks (canonical in docs/WORKFLOW_TWIN_SCORER.md).
    expect(computeSignalStrength(0, 0, 0).strength).toBe("none");
    expect(computeSignalStrength(1, 0, 0).strength).toBe("weak");
    expect(computeSignalStrength(2, 4, 0).strength).toBe("weak");
    expect(computeSignalStrength(3, 0, 0).strength).toBe("moderate");
    expect(computeSignalStrength(3, 3, 2).strength).toBe("strong");
    expect(computeSignalStrength(10, 0, 0).strength).toBe("strong");
    expect(computeSignalStrength(0, 0, 0).note).toContain("Provisional");
    expect(computeSignalStrength(1, 0, 0).note).toContain("Provisional");
    expect(computeSignalStrength(10, 0, 0).note).not.toContain("Provisional");

    // Cold-start run: empty workspace produces a provisional-labelled run whose
    // signal entry is informational (blocked: false) and never blocks gating.
    const workspaceId = `workspace-signal-${Date.now()}`;
    const readinessSpy = vi.spyOn(repository, "setPilotReadiness");
    const scorerTwin = await repository.createWorkflowTwin(
      workspaceId,
      { type: "workflow_scorer", name: "Workflow Twin Scorer", status: "active", config: {}, owner: "strategy" },
      "tester"
    );
    stubStrategyProfile(null);
    const run = await buildWorkflowTwinRunInput(scorerTwin, workspaceId);
    const signal = run.payload.signal as { strength: string; note: string };
    expect(signal.strength).toBe("none");
    expect(run.summary).toContain("Provisional");
    // Payload gates stay pure (no signal entry); persisted gates carry the
    // informational entry with blocked: false.
    const payloadGates = run.payload.pilotGates as Array<{ key: string }>;
    expect(payloadGates.find((g) => g.key === "signal_strength")).toBeUndefined();
    const persisted = readinessSpy.mock.calls[readinessSpy.mock.calls.length - 1]?.[2] as Array<{ key: string; blocked: boolean }>;
    const persistedSignal = persisted.find((g) => g.key === "signal_strength");
    expect(persistedSignal).toBeTruthy();
    expect(persistedSignal?.blocked).toBe(false);
  });

  it("updates workflow twin config for backcasting and shadow ROI state", async () => {
    const workspaceId = `workspace-workflow-config-${Date.now()}`;
    const twin = await repository.createWorkflowTwin(
      workspaceId,
      {
        type: "decision_action",
        name: "Decision & Action Twin",
        status: "active",
        config: {},
        owner: "ceo"
      },
      "tester"
    );

    const updated = await repository.updateWorkflowTwinConfig(
      workspaceId,
      twin.id,
      {
        backcast: { targetState: "Leadership gets decisions and owners in one weekly brief." },
        shadowMeasurements: [{ workflowName: "Weekly review", minutesSavedPerRun: 90 }]
      },
      "tester"
    );

    expect(updated?.config.backcast).toMatchObject({ targetState: expect.stringContaining("Leadership") });
    expect(updated?.config.shadowMeasurements).toEqual([
      expect.objectContaining({ workflowName: "Weekly review", minutesSavedPerRun: 90 })
    ]);
  });
});
