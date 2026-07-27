import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvidenceRecord, Recommendation, WorkspaceProfile } from "@/lib/contracts";

const mocks = vi.hoisted(() => ({
  getEvidenceForWorkspace: vi.fn(),
  getWorkspaceProfile: vi.fn(),
  getRecommendations: vi.fn(),
  ask: vi.fn()
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getEvidenceForWorkspace: mocks.getEvidenceForWorkspace,
    getWorkspaceProfile: mocks.getWorkspaceProfile,
    getRecommendations: mocks.getRecommendations
  }
}));

vi.mock("@/lib/services/llm", () => ({
  ask: mocks.ask
}));

const { buildOnePager, buildRecoRegister, buildRiskRadar, buildWeeklyBrief, extractRiskSignals } = await import(
  "@/lib/services/exports"
);

function evidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: "ev-1",
    tenantId: "tenant-acme",
    workspaceId: "workspace-acme",
    sourceType: "document",
    sourcePath: "/uploads/board/board-pack.pdf",
    sourceTimestamp: "2026-07-01T00:00:00.000Z",
    ingestedAt: "2026-07-01T01:00:00.000Z",
    hash: "sha256:1",
    sensitivity: "internal",
    extractionConfidence: 0.8,
    ingestionStatus: "processed",
    freshnessHours: 12,
    department: "Finance",
    text: "Quarterly summary with no notable signals.",
    ...overrides
  };
}

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "rec-1",
    tenantId: "tenant-acme",
    workspaceId: "workspace-acme",
    title: "Renegotiate the logistics contract",
    owner: "COO",
    status: "draft",
    confidence: 0.7,
    affectedEntityIds: ["operations"],
    evidenceRefs: ["ev-1"],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides
  };
}

function profile(overrides: Partial<WorkspaceProfile> = {}): WorkspaceProfile {
  return {
    workspaceId: "workspace-acme",
    companyName: "Acme Ltd",
    sector: "technology_saas",
    primaryGoals: [],
    priorityRoles: [],
    briefLanguageMode: "formal",
    locationCount: 1,
    roleStates: {},
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEvidenceForWorkspace.mockResolvedValue([]);
  mocks.getWorkspaceProfile.mockResolvedValue(null);
  mocks.getRecommendations.mockResolvedValue([]);
  mocks.ask.mockResolvedValue("Executive narrative grounded in the supplied evidence.");
});

describe("extractRiskSignals", () => {
  it("ranks high severity signals ahead of medium and low", () => {
    const signals = extractRiskSignals([
      evidence({ id: "ev-low", text: "Routine weekly update." }),
      evidence({ id: "ev-med", text: "Vendor delay on the migration blocker." }),
      evidence({ id: "ev-high", text: "Regulatory audit finding requires urgent escalation." })
    ]);

    expect(signals.map((signal) => signal.evidenceId)).toEqual(["ev-high", "ev-med", "ev-low"]);
    expect(signals.map((signal) => signal.severity)).toEqual(["high", "medium", "low"]);
  });

  it("excludes restricted and unprocessed evidence", () => {
    const signals = extractRiskSignals([
      evidence({ id: "ev-restricted", sensitivity: "restricted", text: "Critical breach detail." }),
      evidence({ id: "ev-queued", ingestionStatus: "queued" }),
      evidence({ id: "ev-ok" })
    ]);

    expect(signals.map((signal) => signal.evidenceId)).toEqual(["ev-ok"]);
  });

  it("derives title and source from the file name and defaults the department", () => {
    const [signal] = extractRiskSignals([evidence({ department: undefined })]);

    expect(signal).toMatchObject({ title: "board-pack.pdf", source: "board-pack.pdf", department: "General" });
  });

  it("honours the limit", () => {
    const records = Array.from({ length: 5 }, (_, index) => evidence({ id: `ev-${index}` }));

    expect(extractRiskSignals(records, 2)).toHaveLength(2);
  });
});

describe("buildWeeklyBrief", () => {
  it("briefs the core four roles when the profile has no priority roles", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([evidence()]);

    const brief = await buildWeeklyBrief("workspace-acme", "Acme Ltd");

    expect(brief.activeRoles.map((role) => role.role)).toEqual(["ceo", "coo", "cbo", "cto"]);
    expect(brief.workspaceName).toBe("Acme Ltd");
    expect(mocks.ask).toHaveBeenCalledTimes(4);
  });

  it("briefs at most six profile priority roles and labels them", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([evidence()]);
    mocks.getWorkspaceProfile.mockResolvedValue(
      profile({ priorityRoles: ["ceo", "cfo", "cro", "cco", "chro", "cpo", "cto"] })
    );

    const brief = await buildWeeklyBrief("workspace-acme", "Acme Ltd");

    expect(brief.activeRoles).toHaveLength(6);
    expect(brief.activeRoles.map((role) => role.label)).toContain("CFO / Finance");
  });

  it("counts open and approved recommendations", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([evidence()]);
    mocks.getRecommendations.mockResolvedValue([
      recommendation({ id: "rec-1", status: "draft" }),
      recommendation({ id: "rec-2", status: "in_review" }),
      recommendation({ id: "rec-3", status: "approved" }),
      recommendation({ id: "rec-4", status: "rejected" })
    ]);

    const brief = await buildWeeklyBrief("workspace-acme", "Acme Ltd");

    expect(brief.openRecommendations).toBe(2);
    expect(brief.approvedRecommendations).toBe(1);
  });

  it("explains the empty state instead of calling the LLM when no evidence is processed", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([evidence({ ingestionStatus: "queued" })]);

    const brief = await buildWeeklyBrief("workspace-acme", "Acme Ltd");

    expect(mocks.ask).not.toHaveBeenCalled();
    expect(brief.activeRoles[0].narrative).toContain("No processed evidence available");
  });

  it("degrades to a configuration hint when the LLM call fails", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([evidence()]);
    mocks.ask.mockRejectedValue(new Error("llm down"));

    const brief = await buildWeeklyBrief("workspace-acme", "Acme Ltd");

    expect(brief.activeRoles.every((role) => role.narrative.includes("AI synthesis unavailable"))).toBe(true);
  });
});

describe("buildRiskRadar", () => {
  it("buckets signals by severity and excludes restricted evidence", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([
      evidence({ id: "ev-high", text: "Sanction penalty escalated to the board." }),
      evidence({ id: "ev-med", text: "Delivery delay is a blocker for onboarding." }),
      evidence({ id: "ev-low" }),
      evidence({ id: "ev-restricted", sensitivity: "restricted", text: "Fraud investigation detail." })
    ]);

    const radar = await buildRiskRadar("workspace-acme", "Acme Ltd");

    expect(radar.totalSignals).toBe(3);
    expect(radar.high.map((signal) => signal.evidenceId)).toEqual(["ev-high"]);
    expect(radar.medium.map((signal) => signal.evidenceId)).toEqual(["ev-med"]);
    expect(radar.low.map((signal) => signal.evidenceId)).toEqual(["ev-low"]);
  });
});

describe("buildRecoRegister", () => {
  it("orders rows by workflow status and preserves provenance fields", async () => {
    mocks.getRecommendations.mockResolvedValue([
      recommendation({ id: "rec-approved", status: "approved" }),
      recommendation({ id: "rec-draft", status: "draft" }),
      recommendation({ id: "rec-review", status: "in_review" })
    ]);

    const register = await buildRecoRegister("workspace-acme", "Acme Ltd");

    expect(register.rows.map((row) => row.id)).toEqual(["rec-draft", "rec-review", "rec-approved"]);
    expect(register.rows[0]).toMatchObject({ owner: "COO", evidenceRefs: ["ev-1"], confidence: 0.7 });
  });
});

describe("buildOnePager", () => {
  it("summarises evidence counts, top findings, risks, and open recommendations", async () => {
    mocks.getEvidenceForWorkspace.mockResolvedValue([
      evidence({ id: "ev-weak", sourcePath: "/uploads/weak.pdf", extractionConfidence: 0.2 }),
      evidence({
        id: "ev-strong",
        sourcePath: "/uploads/strong.pdf",
        extractionConfidence: 0.95,
        text: "Urgent regulatory breach identified."
      }),
      evidence({ id: "ev-queued", ingestionStatus: "queued" })
    ]);
    mocks.getRecommendations.mockResolvedValue([
      recommendation({ id: "rec-draft", status: "draft" }),
      recommendation({ id: "rec-approved", status: "approved" })
    ]);

    const onePager = await buildOnePager("workspace-acme", "Acme Ltd");

    expect(onePager.totalEvidenceRecords).toBe(3);
    expect(onePager.processedRecords).toBe(2);
    expect(onePager.activeRoles).toEqual(["CEO", "COO / Operations", "CBO / Strategy", "CTO / Technology"]);
    expect(onePager.topFindings[0]).toBe("strong.pdf (Finance) — 95% confidence");
    expect(onePager.topRisks[0]).toBe("HIGH: strong.pdf (Finance)");
    expect(onePager.openRecommendations.map((row) => row.id)).toEqual(["rec-draft"]);
  });

  it("labels unknown priority roles from the role key", async () => {
    mocks.getWorkspaceProfile.mockResolvedValue(profile({ priorityRoles: ["head_of_data"] }));

    const onePager = await buildOnePager("workspace-acme", "Acme Ltd");

    expect(onePager.activeRoles).toEqual(["Head Of Data"]);
  });
});
