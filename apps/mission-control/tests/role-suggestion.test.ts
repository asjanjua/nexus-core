import { describe, expect, it } from "vitest";
import { suggestRolesForProfile } from "@/lib/services/role-suggestion";

describe("role suggestion", () => {
  it("keeps CEO first and locked for every archetype", () => {
    const roles = suggestRolesForProfile({
      sector: "retail_commerce",
      companyArchetype: "sme_physical",
      companyStage: "early_stage",
      employeeBand: "1_10",
      description: "Owner-operated restaurant with staff scheduling and weekly cash concerns"
    });

    expect(roles[0]).toMatchObject({
      roleKey: "ceo",
      label: "Owner",
      locked: true,
      state: "active"
    });
  });

  it("prioritizes risk and compliance for regulated financial services", () => {
    const roles = suggestRolesForProfile({
      sector: "financial_services",
      companyArchetype: "corporate",
      companyStage: "scale_up",
      employeeBand: "201_1000",
      description: "Licensed payments company with AML, KYC, fraud, compliance, and regulator reporting"
    });

    const activeKeys = roles.filter((role) => role.state === "active").map((role) => role.roleKey);
    expect(activeKeys).toContain("cro");
    expect(activeKeys).toContain("cco");
  });

  it("raises performance marketing for digital-native ad-driven companies", () => {
    const roles = suggestRolesForProfile({
      sector: "retail_commerce",
      companyArchetype: "digital_native",
      companyStage: "growth",
      employeeBand: "51_200",
      description: "D2C brand using Meta Ads, Google Ads, ROAS reporting, TikTok creators, and email CRM"
    });

    const roleKeys = roles.map((role) => role.roleKey);
    expect(roleKeys).toContain("vp_performance_mktg");
    expect(roleKeys).toContain("brand_community");
  });

  it("uses small-business role labels and dual-hat candidates for early physical companies", () => {
    const roles = suggestRolesForProfile({
      sector: "retail_commerce",
      companyArchetype: "sme_physical",
      companyStage: "early_stage",
      employeeBand: "11_50",
      description: "Multi-location cafe with weekly cash, staff rota gaps, suppliers, payroll timing, and Google reviews"
    });

    const byKey = Object.fromEntries(roles.map((role) => [role.roleKey, role]));

    expect(byKey.ceo?.label).toBe("Owner");
    expect(byKey.cfo?.label).toBe("Accounts / Cash");
    expect(byKey.coo?.label).toBe("Ops Manager");
    expect(byKey.cfo?.dualHatCandidate).toBe(true);
    expect(byKey.coo?.dualHatCandidate).toBe(true);
    expect(roles.map((role) => role.roleKey)).not.toContain("cpo");
  });

  it("uses archetype and description signals when sector is unknown", () => {
    const roles = suggestRolesForProfile({
      sector: "custom_unknown",
      companyArchetype: "professional_practice",
      companyStage: "growth",
      employeeBand: "51_200",
      description: "Advisory partnership with partners, practice utilisation, client pipeline, retainers, and engagement margin"
    });

    const roleKeys = roles.map((role) => role.roleKey);

    expect(roleKeys).toContain("managing_partner");
    expect(roleKeys).toContain("practice_lead");
    expect(roleKeys).toContain("cfo");
  });
});
