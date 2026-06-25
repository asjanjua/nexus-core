import { describe, expect, it } from "vitest";
import type { WorkspaceSettings } from "@/lib/contracts";
import { isProviderAllowed, shouldRouteOutputToReview } from "@/lib/security/ai-policy";

const settings: WorkspaceSettings = {
  workspaceId: "workspace-test",
  name: "Test",
  timezone: "UTC",
  llmProvider: "deepseek",
  llmModel: "deepseek-v4-flash",
  quarantineThreshold: 0.55,
  defaultSensitivity: "internal",
  slackEnabled: false,
  teamsEnabled: false,
  allowedProviders: ["deepseek", "openai_compatible"],
  localOnlyMode: false,
  sensitivityCeiling: "confidential",
  approvalRequiredThreshold: 0.7,
  demoMode: false,
  updatedAt: new Date().toISOString()
};

describe("AI policy settings", () => {
  it("allows only configured providers", () => {
    expect(isProviderAllowed(settings, "deepseek")).toBe(true);
    expect(isProviderAllowed(settings, "anthropic")).toBe(false);
  });

  it("blocks cloud providers in local-only mode", () => {
    expect(isProviderAllowed({ ...settings, localOnlyMode: true }, "deepseek")).toBe(false);
    expect(isProviderAllowed({ ...settings, localOnlyMode: true }, "local")).toBe(true);
  });

  it("routes low-confidence outputs to review", () => {
    expect(shouldRouteOutputToReview(settings, 0.69)).toBe(true);
    expect(shouldRouteOutputToReview(settings, 0.7)).toBe(false);
  });
});
