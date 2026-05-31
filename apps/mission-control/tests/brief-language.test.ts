import { describe, expect, it } from "vitest";
import {
  briefLanguageInstruction,
  briefLanguageModeForArchetype,
  buildCompanyContext,
  getArchetypeEvidenceExpectation
} from "@/lib/domain/sector-library";

describe("brief language modes", () => {
  it("uses plain mode for owner-operated physical businesses", () => {
    expect(briefLanguageModeForArchetype("sme_physical")).toBe("plain");

    const instruction = briefLanguageInstruction("plain", "sme_physical");

    expect(instruction).toMatch(/practical owner update/i);
    expect(instruction).toMatch(/weekly profit/i);
    expect(instruction).toMatch(/Avoid these terms/i);
  });

  it("adds archetype evidence expectations and language rules to company context", () => {
    const context = buildCompanyContext({
      companyName: "Cafe One",
      sector: "retail_commerce",
      companyArchetype: "sme_physical",
      briefLanguageMode: "plain",
      companyStage: "early_stage",
      employeeBand: "11_50"
    });

    expect(context).toContain("Archetype: sme physical");
    expect(context).toContain("Expected evidence for this archetype");
    expect(context).toContain("Google Reviews / Business Profile exports");
    expect(context).toContain("Plain brief mode");
  });

  it("defines digital-native evidence expectations", () => {
    const expectation = getArchetypeEvidenceExpectation("digital_native");

    expect(expectation?.briefLanguageMode).toBe("formal");
    expect(expectation?.evidenceTypes).toContain("Meta Ads exports");
    expect(expectation?.evidenceTypes).toContain("Creator / influencer performance data");
  });
});
