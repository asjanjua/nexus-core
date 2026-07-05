import { describe, expect, it } from "vitest";
import { whiteLabelBrandSchema, workspaceSettingsSchema } from "@/lib/contracts";
import { resolveBrand, brandStyleTag, PINAVIA_DEFAULT_BRAND } from "@/lib/branding/white-label";
import { repository } from "@/lib/data/repository";

describe("whiteLabelBrandSchema", () => {
  it("accepts a well-formed override", () => {
    const result = whiteLabelBrandSchema.safeParse({
      logoUrl: "https://example.com/logo.png",
      accentColor: "#3E7BFA",
      fontFamily: "Helvetica Neue",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed hex colour", () => {
    const result = whiteLabelBrandSchema.safeParse({
      logoUrl: null,
      accentColor: "blue",
      fontFamily: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL logoUrl", () => {
    const result = whiteLabelBrandSchema.safeParse({
      logoUrl: "not-a-url",
      accentColor: "#3E7BFA",
      fontFamily: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects CSS injection in fontFamily", () => {
    const result = whiteLabelBrandSchema.safeParse({
      logoUrl: null,
      accentColor: "#3E7BFA",
      fontFamily: "Georgia; background: url(https://evil.example)",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all-null (no override set)", () => {
    const result = whiteLabelBrandSchema.safeParse({
      logoUrl: null,
      accentColor: null,
      fontFamily: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("workspaceSettingsSchema with whiteLabelBrand", () => {
  it("existing settings objects without whiteLabelBrand still validate", () => {
    const result = workspaceSettingsSchema.safeParse({
      workspaceId: "ws-1",
      name: "Acme",
      timezone: "UTC",
      llmProvider: "anthropic",
      llmModel: "claude-opus-4-6",
      quarantineThreshold: 0.55,
      defaultSensitivity: "internal",
      slackEnabled: false,
      teamsEnabled: false,
      allowedProviders: ["anthropic"],
      localOnlyMode: false,
      sensitivityCeiling: "confidential",
      approvalRequiredThreshold: 0.7,
      demoMode: false,
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe("resolveBrand", () => {
  it("returns Pinavia defaults when no override is set", () => {
    const brand = resolveBrand({ whiteLabelBrand: null });
    expect(brand).toEqual(PINAVIA_DEFAULT_BRAND);
  });

  it("merges a partial override over the defaults", () => {
    const brand = resolveBrand({
      whiteLabelBrand: { logoUrl: "https://client.example.com/logo.png", accentColor: null, fontFamily: null },
    });
    expect(brand.logoUrl).toBe("https://client.example.com/logo.png");
    expect(brand.accentColor).toBe(PINAVIA_DEFAULT_BRAND.accentColor);
    expect(brand.fontFamily).toBe(PINAVIA_DEFAULT_BRAND.fontFamily);
  });

  it("fully overrides when all fields are set", () => {
    const brand = resolveBrand({
      whiteLabelBrand: { logoUrl: "https://client.example.com/logo.png", accentColor: "#9AA6B8", fontFamily: "Georgia" },
    });
    expect(brand).toEqual({
      logoUrl: "https://client.example.com/logo.png",
      accentColor: "#9AA6B8",
      fontFamily: "Georgia",
    });
  });

  it("falls back to the default font if unsafe data bypasses schema validation", () => {
    const brand = resolveBrand({
      whiteLabelBrand: {
        logoUrl: null,
        accentColor: "#9AA6B8",
        fontFamily: "Georgia; background: red",
      },
    });
    expect(brand.fontFamily).toBe(PINAVIA_DEFAULT_BRAND.fontFamily);
  });
});

describe("brandStyleTag", () => {
  it("returns an empty string for the default brand (no override cost)", () => {
    expect(brandStyleTag(PINAVIA_DEFAULT_BRAND)).toBe("");
  });

  it("emits CSS custom properties for a client override", () => {
    const css = brandStyleTag({ logoUrl: null, accentColor: "#3E7BFA", fontFamily: "Georgia" });
    expect(css).toContain("--nexus-brand-accent: #3E7BFA");
    expect(css).toContain("--nexus-brand-font: Georgia");
  });
});

describe("workspace settings persistence round-trip", () => {
  it("persists and retrieves a white-label brand override", async () => {
    const workspaceId = `workspace-brand-${Date.now()}`;

    await repository.updateWorkspaceSettings(workspaceId, {
      whiteLabelBrand: { logoUrl: "https://client.example.com/logo.png", accentColor: "#C0A062", fontFamily: null },
    });

    const settings = await repository.getWorkspaceSettings(workspaceId);
    expect(settings.whiteLabelBrand).toEqual({
      logoUrl: "https://client.example.com/logo.png",
      accentColor: "#C0A062",
      fontFamily: null,
    });
  });

  it("defaults to null when never set", async () => {
    const workspaceId = `workspace-brand-unset-${Date.now()}`;
    const settings = await repository.getWorkspaceSettings(workspaceId);
    expect(settings.whiteLabelBrand ?? null).toBeNull();
  });
});
