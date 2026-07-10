import { describe, expect, it } from "vitest";
import { derivePilotLaneStatus } from "@/lib/services/pilot-status";
import type { StrategyProfile, PilotGate } from "@/lib/contracts";

function makeProfile(partial: Partial<StrategyProfile> = {}): StrategyProfile {
  return {
    id: "sp_test",
    workspaceId: "ws",
    buyerLane: "evaluator",
    role: null,
    sector: null,
    companySize: null,
    priority: "medium",
    sponsorName: null,
    sponsorEmail: null,
    reviewerName: null,
    reviewerEmail: null,
    governancePosture: "standard",
    selectedWorkflow: null,
    readinessScores: {},
    readinessBand: null,
    externalRef: null,
    initialLane: null,
    laneChangeReason: null,
    laneConfidence: null,
    laneChangedBy: null,
    laneChangedAt: null,
    pilotReady: false,
    pilotGates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as StrategyProfile;
}

const blockedGates: PilotGate[] = [
  { key: "sponsor_named", label: "Sponsor named", blocked: true },
  { key: "reviewer_named", label: "Reviewer named", blocked: true },
  { key: "evidence_available", label: "Evidence available", blocked: true },
];

const clearGates: PilotGate[] = blockedGates.map((gate) => ({
  ...gate,
  blocked: false,
}));

const signalGate: PilotGate = {
  key: "signal_strength",
  label: "Signal strength: provisional (2 evidence items)",
  blocked: false,
};

describe("derivePilotLaneStatus", () => {
  it("returns start state when there is no profile", () => {
    const status = derivePilotLaneStatus(null);
    expect(status.state).toBe("start");
    expect(status.primaryAction.href).toBe("/start-pilot");
    expect(status.blockedGates).toEqual([]);
  });

  it("returns start state when the scorer never ran", () => {
    const status = derivePilotLaneStatus(makeProfile());
    expect(status.state).toBe("start");
    expect(status.primaryAction.label).toBe("Start readiness setup");
  });

  it("returns gated state with blocked gate names when gates are open", () => {
    const status = derivePilotLaneStatus(
      makeProfile({ pilotGates: blockedGates })
    );
    expect(status.state).toBe("gated");
    expect(status.description).toContain("Sponsor named");
    expect(status.primaryAction.href).toBe("/start-pilot");
    expect(status.next).toBe("Sponsor named");
    expect(status.blockedGates).toHaveLength(3);
  });

  it("returns select state when pilot-ready but no workflow chosen", () => {
    const status = derivePilotLaneStatus(
      makeProfile({ pilotReady: true, pilotGates: clearGates })
    );
    expect(status.state).toBe("select");
    expect(status.primaryAction.href).toBe("/workflows");
    expect(status.blockedGates).toEqual([]);
  });

  it("returns in_motion state once a workflow is selected", () => {
    const status = derivePilotLaneStatus(
      makeProfile({
        pilotReady: true,
        pilotGates: clearGates,
        selectedWorkflow: "Decision & Action Twin",
        sponsorName: "Ayesha Khan",
        reviewerName: "Bilal Raza",
      })
    );
    expect(status.state).toBe("in_motion");
    expect(status.headline).toContain("Decision & Action Twin");
    expect(status.primaryAction.href).toBe("/pilot/paperwork");
    expect(status.now).toContain("Decision & Action Twin");
  });

  it("surfaces the informational signal gate without letting it gate", () => {
    const status = derivePilotLaneStatus(
      makeProfile({
        pilotReady: true,
        pilotGates: [...clearGates, signalGate],
        selectedWorkflow: "Decision & Action Twin",
      })
    );
    expect(status.state).toBe("in_motion");
    expect(status.signalGate?.key).toBe("signal_strength");
    expect(status.blockedGates).toEqual([]);
  });

  it("treats a pilotReady profile with empty gates as select, not start", () => {
    const status = derivePilotLaneStatus(makeProfile({ pilotReady: true }));
    expect(status.state).toBe("select");
  });
});
