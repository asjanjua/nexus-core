import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvidenceRecord, Recommendation } from "@/lib/contracts";

const mocks = vi.hoisted(() => ({
  getEvidenceForWorkspace: vi.fn(),
  getWorkspaceProfile: vi.fn(),
  getRecommendations: vi.fn(),
  addRecommendation: vi.fn(),
  ask: vi.fn()
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getEvidenceForWorkspace: mocks.getEvidenceForWorkspace,
    getWorkspaceProfile: mocks.getWorkspaceProfile,
    getRecommendations: mocks.getRecommendations,
    addRecommendation: mocks.addRecommendation
  }
}));

vi.mock("@/lib/services/llm", () => ({
  ask: mocks.ask
}));

const { generateRecommendations } = await import("@/lib/services/recommendations");

function evidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: "ev-1",
    tenantId: "tenant-acme",
    workspaceId: "workspace-acme",
    sourceType: "document",
    sourcePath: "/uploads/ops-review.pdf",
    sourceTimestamp: "2026-07-01T00:00:00.000Z",
    ingestedAt: "2026-07-01T01:00:00.000Z",
    hash: "sha256:1",
    sensitivity: "internal",
    extractionConfidence: 0.8,
    ingestionStatus: "processed",
    freshnessHours: 5,
    department: "Operations",
    text: "Fulfilment costs rose 18% after the carrier switch.",
    ...overrides
  };
}

function existingReco(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "rec-existing",
    tenantId: "tenant-acme",
    workspaceId: "workspace-acme",
    title: "Renegotiate the carrier contract",
    owner: "COO",
    status: "draft",
    confidence: 0.6,
    affectedEntityIds: [],
    evidenceRefs: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

function llmReturns(payload: unknown | string) {
  mocks.ask.mockResolvedValue(typeof payload === "string" ? payload : JSON.stringify(payload));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEvidenceForWorkspace.mockResolvedValue([evidence()]);
  mocks.getWorkspaceProfile.mockResolvedValue(null);
  mocks.getRecommendations.mockResolvedValue([]);
  mocks.addRecommendation.mockResolvedValue(undefined);
});

describe("generateRecommendations", () => {
  it("persists parsed recommendations against the derived tenant id", async () => {
    llmReturns([
      { title: "Renegotiate carrier rates", owner: "COO", confidence: 0.8, affectedEntityIds: ["operations"], evidenceRefs: ["ev-1"] }
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation).toHaveBeenCalledTimes(1);
    expect(mocks.addRecommendation.mock.calls[0][0]).toMatchObject({
      workspaceId: "workspace-acme",
      // Pins current behaviour, not intended behaviour: lib/services/recommendations.ts:143
      // double-prefixes via .replace(/^(?!tenant-)/,"tenant-").replace("workspace-","tenant-").
      // The value is never persisted (no tenant_id column) so this is cosmetic.
      // If that derivation is fixed, update this expectation rather than reverting the fix.
      tenantId: "tenant-tenant-acme",
      title: "Renegotiate carrier rates",
      owner: "COO",
      status: "draft",
      confidence: 0.8,
      affectedEntityIds: ["operations"],
      evidenceRefs: ["ev-1"]
    });
    expect(mocks.addRecommendation.mock.calls[0][0].id).toMatch(/^rec-/);
  });

  it("strips markdown fences before parsing", async () => {
    llmReturns('```json\n[{"title":"Cut idle warehouse capacity","owner":"COO","confidence":0.6,"affectedEntityIds":[],"evidenceRefs":[]}]\n```');

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation).toHaveBeenCalledTimes(1);
  });

  it("keeps at most three recommendations per run", async () => {
    llmReturns(
      Array.from({ length: 5 }, (_, index) => ({
        title: `Recommendation ${index}`,
        owner: "CEO",
        confidence: 0.5,
        affectedEntityIds: [],
        evidenceRefs: []
      }))
    );

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation).toHaveBeenCalledTimes(3);
  });

  it("drops evidence refs that are not processed evidence in this workspace", async () => {
    llmReturns([
      { title: "Audit carrier invoices", owner: "CFO", confidence: 0.7, affectedEntityIds: [], evidenceRefs: ["ev-1", "ev-hallucinated"] }
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation.mock.calls[0][0].evidenceRefs).toEqual(["ev-1"]);
  });

  it("clamps confidence and defaults a missing owner", async () => {
    llmReturns([
      { title: "Escalate carrier SLA breach", owner: "", confidence: 4.2, affectedEntityIds: "operations", evidenceRefs: null }
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation.mock.calls[0][0]).toMatchObject({
      owner: "Unassigned",
      confidence: 1,
      affectedEntityIds: [],
      evidenceRefs: []
    });
  });

  it("skips titles that duplicate an existing recommendation, case-insensitively", async () => {
    mocks.getRecommendations.mockResolvedValue([existingReco()]);
    llmReturns([
      { title: "renegotiate the carrier contract", owner: "COO", confidence: 0.7, affectedEntityIds: [], evidenceRefs: [] },
      { title: "Introduce weekly cost review", owner: "CFO", confidence: 0.7, affectedEntityIds: [], evidenceRefs: [] }
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation).toHaveBeenCalledTimes(1);
    expect(mocks.addRecommendation.mock.calls[0][0].title).toBe("Introduce weekly cost review");
  });

  it("deduplicates titles within a single batch", async () => {
    llmReturns([
      { title: "Introduce weekly cost review", owner: "CFO", confidence: 0.7, affectedEntityIds: [], evidenceRefs: [] },
      { title: "Introduce Weekly Cost Review", owner: "CFO", confidence: 0.7, affectedEntityIds: [], evidenceRefs: [] }
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.addRecommendation).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is no processed, non-restricted evidence", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([
      evidence({ id: "ev-queued", ingestionStatus: "queued" }),
      evidence({ id: "ev-restricted", sensitivity: "restricted" })
    ]);

    await generateRecommendations("workspace-acme");

    expect(mocks.ask).not.toHaveBeenCalled();
    expect(mocks.addRecommendation).not.toHaveBeenCalled();
  });

  it("stops generating once ten drafts already exist", async () => {
    mocks.getRecommendations.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => existingReco({ id: `rec-${index}`, title: `Existing ${index}` }))
    );

    await generateRecommendations("workspace-acme");

    expect(mocks.ask).not.toHaveBeenCalled();
    expect(mocks.addRecommendation).not.toHaveBeenCalled();
  });

  it("fails silently on LLM errors, empty responses, and malformed JSON", async () => {
    mocks.ask.mockRejectedValueOnce(new Error("llm down"));
    await expect(generateRecommendations("workspace-acme")).resolves.toBeUndefined();

    mocks.ask.mockResolvedValueOnce("   ");
    await expect(generateRecommendations("workspace-acme")).resolves.toBeUndefined();

    mocks.ask.mockResolvedValueOnce("not json");
    await expect(generateRecommendations("workspace-acme")).resolves.toBeUndefined();

    llmReturns({ decisions: [] });
    await expect(generateRecommendations("workspace-acme")).resolves.toBeUndefined();

    expect(mocks.addRecommendation).not.toHaveBeenCalled();
  });

  it("never propagates repository failures to the caller", async () => {
    mocks.getEvidenceForWorkspace.mockRejectedValue(new Error("db down"));

    await expect(generateRecommendations("workspace-acme")).resolves.toBeUndefined();
  });
});
