import { describe, expect, it } from "vitest";
import { assignLane } from "@/lib/services/lane-assignment";

describe("lane assignment", () => {
  it("routes regulated sectors to regulated_enterprise at any size", () => {
    const r = assignLane({ sector: "financial_services", companySize: "1-20", band: "Emerging" });
    expect(r.lane).toBe("regulated_enterprise");
    expect(r.confidence).toBe("high");

    expect(assignLane({ sector: "healthcare", companySize: "200+", band: "AI-Native" }).lane).toBe("regulated_enterprise");
    expect(assignLane({ sector: "government_public" }).lane).toBe("regulated_enterprise");
  });

  it("routes advisory roles to business_advisory", () => {
    const r = assignLane({ sector: "professional_services", companySize: "1-20", role: "consultant", band: "Developing" });
    expect(r.lane).toBe("business_advisory");
  });

  it("routes larger organisations to business_advisory", () => {
    expect(assignLane({ sector: "manufacturing", companySize: "51-200", band: "Developing" }).lane).toBe("business_advisory");
    expect(assignLane({ sector: "technology_saas", companySize: "200+", band: "Emerging" }).lane).toBe("business_advisory");
  });

  it("routes small orgs with implementation intent to sme_self_serve", () => {
    expect(assignLane({ sector: "retail_commerce", companySize: "1-20", band: "Developing" }).lane).toBe("sme_self_serve");
    expect(assignLane({ sector: "technology_saas", companySize: "21-50", band: "AI-Native" }).lane).toBe("sme_self_serve");
  });

  it("defaults small Emerging orgs to evaluator", () => {
    expect(assignLane({ sector: "education_training", companySize: "1-20", band: "Emerging" }).lane).toBe("evaluator");
  });

  it("defaults to evaluator with no signal, at low confidence", () => {
    const r = assignLane({});
    expect(r.lane).toBe("evaluator");
    expect(r.confidence).toBe("low");
  });

  it("grades confidence by available profile fields", () => {
    expect(assignLane({ sector: "manufacturing", companySize: "1-20", band: "Emerging" }).confidence).toBe("high");
    expect(assignLane({ sector: "manufacturing", band: "Emerging" }).confidence).toBe("medium");
    expect(assignLane({ band: "Emerging" }).confidence).toBe("low");
  });

  it("always returns a human-readable reason", () => {
    expect(assignLane({ sector: "financial_services" }).reason.length).toBeGreaterThan(10);
    expect(assignLane({}).reason.length).toBeGreaterThan(10);
  });
});
