import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEvidenceForWorkspace: vi.fn(),
  getRecommendations: vi.fn(),
  getWorkspaceProfile: vi.fn(),
  deleteEvidenceRecord: vi.fn(),
  updateRecommendationStatus: vi.fn(),
  saveWorkspaceProfile: vi.fn(),
  pushAudit: vi.fn(),
  ingestEvidence: vi.fn(),
  generateRecommendations: vi.fn(),
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getEvidenceForWorkspace: mocks.getEvidenceForWorkspace,
    getRecommendations: mocks.getRecommendations,
    getWorkspaceProfile: mocks.getWorkspaceProfile,
    deleteEvidenceRecord: mocks.deleteEvidenceRecord,
    updateRecommendationStatus: mocks.updateRecommendationStatus,
    saveWorkspaceProfile: mocks.saveWorkspaceProfile,
    pushAudit: mocks.pushAudit,
  },
}));
vi.mock("@/lib/services/ingestion", () => ({ ingestEvidence: mocks.ingestEvidence }));
vi.mock("@/lib/services/recommendations", () => ({ generateRecommendations: mocks.generateRecommendations }));

const { DemoPackSeedRefusedError, seedSectorPack } = await import("@/lib/demo/seed-sector-pack");

describe("sector demo pack seeding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvidenceForWorkspace.mockResolvedValue([]);
    mocks.getRecommendations.mockResolvedValue([]);
    mocks.getWorkspaceProfile.mockResolvedValue(null);
    mocks.saveWorkspaceProfile.mockResolvedValue(undefined);
    mocks.pushAudit.mockResolvedValue(undefined);
    mocks.ingestEvidence.mockResolvedValue({ id: "ev-demo" });
    mocks.generateRecommendations.mockResolvedValue([]);
  });

  it("refuses to replace an existing workspace when called from a trial", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([{ id: "ev-real" }]);

    await expect(seedSectorPack({
      workspaceId: "org-existing", actor: "user-prospect", sector: "financial_services",
    })).rejects.toBeInstanceOf(DemoPackSeedRefusedError);

    expect(mocks.deleteEvidenceRecord).not.toHaveBeenCalled();
    expect(mocks.saveWorkspaceProfile).not.toHaveBeenCalled();
  });

  it("allows the separately guarded admin reset path to replace demo data", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([{ id: "ev-old" }]);

    const seeded = await seedSectorPack({
      workspaceId: "workspace-demo", actor: "admin", sector: "financial_services", replace: true,
    });

    expect(mocks.deleteEvidenceRecord).toHaveBeenCalledWith("ev-old", "admin");
    expect(mocks.saveWorkspaceProfile).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: "workspace-demo", sector: "financial_services",
    }));
    expect(seeded.evidenceSeeded).toBeGreaterThan(0);
  });
});
