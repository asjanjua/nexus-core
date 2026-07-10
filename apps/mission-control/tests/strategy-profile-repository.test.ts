import { afterEach, describe, expect, it, vi } from "vitest";
import { repository } from "@/lib/data/repository";
import type { StrategyProfile } from "@/lib/contracts";

const baseProfile: StrategyProfile = {
  id: "sp_workspace-alice",
  workspaceId: "workspace-alice",
  buyerLane: "regulated_enterprise",
  role: null,
  sector: "financial_services",
  companySize: "200+",
  priority: "medium",
  sponsorName: null,
  sponsorEmail: null,
  reviewerName: null,
  reviewerEmail: null,
  governancePosture: "regulated",
  selectedWorkflow: null,
  readinessScores: {},
  readinessBand: "Building",
  externalRef: "readiness_submission:rs_123",
  initialLane: "regulated_enterprise",
  laneChangeReason: null,
  laneConfidence: "high",
  laneChangedBy: null,
  laneChangedAt: null,
  pilotReady: false,
  pilotGates: [],
  createdAt: new Date("2026-07-06T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-07-06T00:00:00.000Z").toISOString(),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("strategy profile repository audit", () => {
  it("audits old and new lane when a confirmed regulated exit is saved", async () => {
    vi.spyOn(repository, "getStrategyProfile").mockResolvedValue(baseProfile);
    const pushAudit = vi.spyOn(repository, "pushAudit").mockResolvedValue(undefined);

    await repository.upsertStrategyProfile("workspace-alice", {
      buyerLane: "business_advisory",
      laneChangeReason: "compliance profile was entered incorrectly",
      laneChangedBy: "user_confirmation",
      laneChangedAt: "2026-07-06T12:00:00.000Z",
      regulatedExitConfirmed: true,
    });

    expect(pushAudit).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: "workspace-alice",
      type: "strategy_profile_updated",
      payload: expect.objectContaining({
        oldBuyerLane: "regulated_enterprise",
        newBuyerLane: "business_advisory",
        buyerLane: "business_advisory",
        laneChangeReason: "compliance profile was entered incorrectly",
        laneChangedBy: "user_confirmation",
        laneChangedAt: "2026-07-06T12:00:00.000Z",
        regulatedExitConfirmed: true,
      }),
    }));
  });
});
