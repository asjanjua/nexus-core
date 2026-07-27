import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ask: vi.fn()
}));

vi.mock("@/lib/services/llm", () => ({
  ask: mocks.ask
}));

const { detectCompanyProfile, mapFocusToDashboard } = await import("@/lib/services/company-detection");

const DESCRIPTION = "Licensed payments company in the UAE handling AML, KYC, and regulator reporting.";

function detectionPayload(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Pinavia Payments",
    sector: "financial_services",
    subsector: "payments",
    businessModel: "b2b",
    companyArchetype: "corporate",
    companyStage: "scale_up",
    employeeBand: "201_1000",
    region: "UAE",
    primaryGoals: ["expand licences", 42],
    riskProfile: "conservative",
    suggestedDocuments: [
      { name: "AML policy", type: "pdf", priority: "high", description: "Current AML programme" }
    ],
    suggestedKPIs: ["Payment success rate"],
    suggestedRisks: ["Regulatory breach"],
    sensitivityDefault: "confidential",
    confidence: 0.9,
    reasoning: "Regulated payments profile.",
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectCompanyProfile", () => {
  it("rejects descriptions that are missing or too short without calling the LLM", async () => {
    await expect(detectCompanyProfile("")).resolves.toBeNull();
    await expect(detectCompanyProfile("   ")).resolves.toBeNull();
    await expect(detectCompanyProfile("too short")).resolves.toBeNull();
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("maps a well-formed response onto the detected profile", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify(detectionPayload()));

    const profile = await detectCompanyProfile(DESCRIPTION, { workspaceId: "workspace-acme" });

    expect(profile).toMatchObject({
      companyName: "Pinavia Payments",
      sector: "financial_services",
      subsector: "payments",
      companyArchetype: "corporate",
      companyStage: "scale_up",
      region: "UAE",
      riskProfile: "conservative",
      sensitivityDefault: "confidential",
      confidence: 0.9,
      requiresRoleConfirmation: false
    });
    expect(profile?.sectorLabel).toBeTruthy();
    expect(profile?.primaryGoals).toEqual(["expand licences"]);
    expect(profile?.suggestedDocuments).toEqual([
      { name: "AML policy", type: "pdf", priority: "high", description: "Current AML programme" }
    ]);
    expect(profile?.priorityRoles).toContain("ceo");
    expect(profile?.priorityRoles.length).toBeGreaterThan(1);
    expect(Object.keys(profile?.suggestedRoleReasons ?? {})).toEqual(
      expect.arrayContaining(profile?.priorityRoles ?? [])
    );
  });

  it("strips markdown fences before parsing", async () => {
    mocks.ask.mockResolvedValue("```json\n" + JSON.stringify(detectionPayload()) + "\n```");

    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toMatchObject({ sector: "financial_services" });
  });

  it("returns null when the LLM throws, is unavailable, or returns unparseable text", async () => {
    mocks.ask.mockRejectedValueOnce(new Error("llm down"));
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce("[LLM unavailable — configure an API key]");
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce("");
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce("not json at all");
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toBeNull();
  });

  it("infers the archetype from the sector and asks for confirmation when it is missing", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify(detectionPayload({ sector: "professional_services", companyArchetype: "unknown_archetype" }))
    );

    const profile = await detectCompanyProfile(DESCRIPTION);

    expect(profile?.companyArchetype).toBe("professional_practice");
    expect(profile?.requiresRoleConfirmation).toBe(true);
  });

  it("asks for role confirmation when the model reports low confidence", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify(detectionPayload({ confidence: 0.3 })));

    const profile = await detectCompanyProfile(DESCRIPTION);

    expect(profile?.confidence).toBe(0.3);
    expect(profile?.requiresRoleConfirmation).toBe(true);
  });

  it("clamps confidence into 0..1 and defaults it when absent", async () => {
    mocks.ask.mockResolvedValueOnce(JSON.stringify(detectionPayload({ confidence: 7 })));
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toMatchObject({ confidence: 1 });

    mocks.ask.mockResolvedValueOnce(JSON.stringify(detectionPayload({ confidence: "high" })));
    await expect(detectCompanyProfile(DESCRIPTION)).resolves.toMatchObject({ confidence: 0.7 });
  });

  it("falls back to sector defaults for documents, KPIs, and risks", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify(
        detectionPayload({ suggestedDocuments: "none", suggestedKPIs: [], suggestedRisks: undefined })
      )
    );

    const profile = await detectCompanyProfile(DESCRIPTION);

    expect(profile?.suggestedDocuments.length).toBeGreaterThan(0);
    expect(profile?.suggestedKPIs.length).toBeGreaterThan(0);
    expect(profile?.suggestedRisks.length).toBeGreaterThan(0);
  });

  it("caps suggested documents at five and normalises unknown type and priority values", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify(
        detectionPayload({
          suggestedDocuments: [
            { name: "Doc 1", type: "csv", priority: "urgent" },
            ...Array.from({ length: 6 }, (_, index) => ({ name: `Doc ${index + 2}`, type: "docx", priority: "high" }))
          ]
        })
      )
    );

    const profile = await detectCompanyProfile(DESCRIPTION);

    expect(profile?.suggestedDocuments).toHaveLength(5);
    expect(profile?.suggestedDocuments[0]).toMatchObject({ type: "pdf", priority: "medium", description: "" });
  });

  it("falls back to technology_saas defaults when the sector is unknown", async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify(detectionPayload({ sector: "space_mining", companyName: "", sensitivityDefault: "public" }))
    );

    const profile = await detectCompanyProfile(DESCRIPTION);

    expect(profile).toMatchObject({
      sector: "technology_saas",
      sectorLabel: "space_mining",
      companyName: null,
      sensitivityDefault: "internal"
    });
  });
});

describe("mapFocusToDashboard", () => {
  const FOCUS_RESPONSE = {
    recommendedDashboards: ["ceo", "cro", "coo", "cto", "cbo"],
    suggestedQuestions: ["What is slipping?", "Where is cash going?", "a", "b", "c", "d"],
    focusSummary: "Monitors delivery and cash."
  };

  it("rejects intents that are missing or too short without calling the LLM", async () => {
    await expect(mapFocusToDashboard("", "")).resolves.toBeNull();
    await expect(mapFocusToDashboard("cash", "")).resolves.toBeNull();
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it("keeps only known dashboards and caps dashboards and questions", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify(FOCUS_RESPONSE));

    const mapping = await mapFocusToDashboard("keep delivery and cash on track", "Company: Acme Ltd");

    expect(mapping).toEqual({
      recommendedDashboards: ["ceo", "coo", "cto"],
      suggestedQuestions: ["What is slipping?", "Where is cash going?", "a", "b", "c"],
      focusSummary: "Monitors delivery and cash."
    });
  });

  it("includes the company context in the prompt when supplied", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify(FOCUS_RESPONSE));

    await mapFocusToDashboard("keep delivery on track", "Company: Acme Ltd");
    expect(mocks.ask.mock.calls[0][0]).toContain("Company: Acme Ltd");

    await mapFocusToDashboard("keep delivery on track", "");
    expect(mocks.ask.mock.calls[1][0]).not.toContain("Company: Acme Ltd");
  });

  it("returns null when no known dashboard or no question survives filtering", async () => {
    mocks.ask.mockResolvedValueOnce(
      JSON.stringify({ ...FOCUS_RESPONSE, recommendedDashboards: ["board", "audit"] })
    );
    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce(JSON.stringify({ ...FOCUS_RESPONSE, suggestedQuestions: [] }));
    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toBeNull();
  });

  it("returns null when the LLM throws, is unavailable, or returns unparseable text", async () => {
    mocks.ask.mockRejectedValueOnce(new Error("llm down"));
    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce("[LLM unavailable — configure an API key]");
    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toBeNull();

    mocks.ask.mockResolvedValueOnce("```json\nnot json\n```");
    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toBeNull();
  });

  it("defaults the focus summary when the model omits it", async () => {
    mocks.ask.mockResolvedValue(JSON.stringify({ ...FOCUS_RESPONSE, focusSummary: 12 }));

    await expect(mapFocusToDashboard("keep delivery on track", "")).resolves.toMatchObject({ focusSummary: "" });
  });
});
