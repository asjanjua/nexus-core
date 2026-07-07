/**
 * Regression: /api/strategy-profile must ignore caller-supplied workspaceId.
 * Before this fix, any authenticated caller could read or write another
 * workspace's strategy profile via ?workspaceId= or a body field.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveAuth: vi.fn(),
  DEFAULT_WORKSPACE: "workspace-demo",
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getStrategyProfile: vi.fn().mockResolvedValue(null),
    upsertStrategyProfile: vi.fn().mockImplementation(async (workspaceId: string, input: unknown) => ({
      id: `sp_${workspaceId}`,
      workspaceId,
      ...(input as Record<string, unknown>),
    })),
  },
}));

import { GET, PATCH } from "@/app/api/strategy-profile/route";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const mockResolveAuth = vi.mocked(resolveAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveAuth.mockResolvedValue({
    workspaceId: "workspace-alice",
    userId: "alice",
    scopes: ["*"],
    authType: "session",
  } as Awaited<ReturnType<typeof resolveAuth>>);
  vi.mocked(repository.getStrategyProfile).mockResolvedValue(null);
});

describe("strategy-profile authz", () => {
  it("GET ignores workspaceId query param and uses the caller's workspace", async () => {
    await GET(new Request("http://localhost/api/strategy-profile?workspaceId=workspace-victim"));
    expect(repository.getStrategyProfile).toHaveBeenCalledWith("workspace-alice");
  });

  it("PATCH ignores workspaceId in the body and writes to the caller's workspace", async () => {
    await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: "workspace-victim", buyerLane: "business_advisory" }),
      })
    );
    expect(repository.upsertStrategyProfile).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({ buyerLane: "business_advisory" })
    );
  });

  it("PATCH accepts lane lifecycle fields", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
      id: "sp_workspace-alice",
      workspaceId: "workspace-alice",
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
      initialLane: "evaluator",
      laneChangeReason: null,
      laneConfidence: null,
      laneChangedBy: null,
      laneChangedAt: null,
      pilotReady: false,
      pilotGates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerLane: "sme_self_serve",
          laneChangeReason: "company size was wrong",
          laneChangedBy: "user_confirmation",
          laneChangedAt: new Date().toISOString(),
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("PATCH rejects a lane change without a reason", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
      id: "sp_workspace-alice",
      workspaceId: "workspace-alice",
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
      initialLane: "evaluator",
      laneChangeReason: null,
      laneConfidence: null,
      laneChangedBy: null,
      laneChangedAt: null,
      pilotReady: false,
      pilotGates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerLane: "business_advisory" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "lane_change_reason_required" });
    expect(repository.upsertStrategyProfile).not.toHaveBeenCalled();
  });

  it("PATCH rejects regulated_enterprise exit without confirmation", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
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
      readinessBand: null,
      externalRef: null,
      initialLane: "regulated_enterprise",
      laneChangeReason: null,
      laneConfidence: "high",
      laneChangedBy: null,
      laneChangedAt: null,
      pilotReady: false,
      pilotGates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerLane: "business_advisory",
          laneChangeReason: "compliance profile was entered incorrectly",
          laneChangedBy: "user_confirmation",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "regulated_exit_confirmation_required" });
    expect(repository.upsertStrategyProfile).not.toHaveBeenCalled();
  });

  it("PATCH accepts confirmed regulated_enterprise exit and passes audit context", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
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
      readinessBand: null,
      externalRef: null,
      initialLane: "regulated_enterprise",
      laneChangeReason: null,
      laneConfidence: "high",
      laneChangedBy: null,
      laneChangedAt: null,
      pilotReady: false,
      pilotGates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerLane: "business_advisory",
          laneChangeReason: "compliance profile was entered incorrectly",
          laneChangedBy: "user_confirmation",
          regulatedExitConfirmed: true,
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(repository.upsertStrategyProfile).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({
        buyerLane: "business_advisory",
        laneChangeReason: "compliance profile was entered incorrectly",
        laneChangedBy: "user_confirmation",
        laneChangedAt: expect.any(String),
        regulatedExitConfirmed: true,
      })
    );
  });

  it("PATCH accepts ordinary lane refinement with a reason", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
      id: "sp_workspace-alice",
      workspaceId: "workspace-alice",
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
      initialLane: "evaluator",
      laneChangeReason: null,
      laneConfidence: "low",
      laneChangedBy: null,
      laneChangedAt: null,
      pilotReady: false,
      pilotGates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerLane: "sme_self_serve",
          laneChangeReason: "company size corrected during onboarding",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(repository.upsertStrategyProfile).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({
        buyerLane: "sme_self_serve",
        laneChangeReason: "company size corrected during onboarding",
        laneChangedBy: "user_confirmation",
        laneChangedAt: expect.any(String),
      })
    );
  });

  it("PATCH rejects selectedWorkflow when the profile is not pilot-ready", async () => {
    // The scorer owns gate evaluation and persists pilotReady; the route
    // enforces that single field. pilotReady false => selection blocked.
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
      id: "sp_workspace-alice",
      workspaceId: "workspace-alice",
      buyerLane: "business_advisory",
      role: null, sector: null, companySize: null, priority: "medium",
      sponsorName: null, sponsorEmail: null, reviewerName: null, reviewerEmail: null,
      governancePosture: "standard", selectedWorkflow: null,
      readinessScores: {}, readinessBand: null, externalRef: null,
      initialLane: "business_advisory", laneChangeReason: null, laneConfidence: "medium",
      laneChangedBy: null, laneChangedAt: null,
      pilotReady: false,
      pilotGates: [{ key: "sponsor_named", label: "Named sponsor", blocked: true }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedWorkflow: "Decision & Action Twin" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "pilot_gates_unmet",
      blockedGates: [{ key: "sponsor_named" }],
    });
    expect(repository.upsertStrategyProfile).not.toHaveBeenCalled();
  });

  it("PATCH accepts selectedWorkflow when the profile is pilot-ready", async () => {
    vi.mocked(repository.getStrategyProfile).mockResolvedValueOnce({
      id: "sp_workspace-alice",
      workspaceId: "workspace-alice",
      buyerLane: "business_advisory",
      role: null, sector: null, companySize: null, priority: "medium",
      sponsorName: "A. Sponsor", sponsorEmail: null, reviewerName: "R. Reviewer", reviewerEmail: null,
      governancePosture: "standard", selectedWorkflow: null,
      readinessScores: {}, readinessBand: null, externalRef: null,
      initialLane: "business_advisory", laneChangeReason: null, laneConfidence: "medium",
      laneChangedBy: null, laneChangedAt: null,
      pilotReady: true,
      pilotGates: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const res = await PATCH(
      new Request("http://localhost/api/strategy-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedWorkflow: "Decision & Action Twin" }),
      })
    );

    expect(res.status).toBe(200);
    expect(repository.upsertStrategyProfile).toHaveBeenCalledWith(
      "workspace-alice",
      expect.objectContaining({ selectedWorkflow: "Decision & Action Twin" })
    );
  });
});
