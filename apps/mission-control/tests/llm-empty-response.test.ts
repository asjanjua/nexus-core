import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getWorkspaceBillingState: vi.fn(async () => ({
      plan: "free",
      monthlyTokenLimit: 500_000,
      monthlyTokenUsed: 0,
      tokenResetAt: new Date(Date.now() + 86_400_000).toISOString(),
      planChangedAt: null
    })),
    getPlanDefinition: vi.fn(async () => ({
      planKey: "free",
      label: "Free",
      priceCents: 0,
      monthlyTokens: 500_000,
      maxRoles: 1,
      maxEvidence: 50,
      maxTeam: 1,
      maxConnectors: 0,
      maxApiKeys: 0,
      askDailyLimit: 10,
      scheduledSynthesis: false,
      synthesisMaxCadence: null,
      emailDelivery: false,
      slackDelivery: false,
      exportsEnabled: false,
      decisionExtraction: false,
      customPassports: false,
      dataResidency: false,
      watermark: true,
      apiAccess: false
    })),
    recordLLMUsage: vi.fn(async () => undefined),
    getWorkspaceSettings: vi.fn(async () => ({
      allowedProviders: ["deepseek", "anthropic", "openai_compatible"],
      localOnlyMode: false
    }))
  }
}));

vi.mock("@/lib/security/ai-policy", () => ({
  isProviderAllowed: vi.fn(() => true)
}));

describe("LLM empty response handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXUS_LLM_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek-key");
    vi.stubEnv("NEXUS_LLM_MODEL", "deepseek-v4-pro");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("disables DeepSeek thinking mode for quick calls and rejects empty content", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        thinking?: { type?: string };
      };
      expect(body.thinking).toEqual({ type: "disabled" });

      return new Response(
        JSON.stringify({
          model: "deepseek-v4-pro",
          choices: [
            {
              message: {
                content: "",
                reasoning_content: "Internal reasoning was returned but no final answer."
              },
              finish_reason: "stop"
            }
          ],
          usage: { prompt_tokens: 12, completion_tokens: 8 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { callLLM } = await import("@/lib/services/llm");

    await expect(
      callLLM([{ role: "user", content: "What are the top risks?" }], {
        workspaceId: "workspace-llm-empty",
        route: "ask"
      })
    ).rejects.toThrow("returned empty message.content");
  });
});
