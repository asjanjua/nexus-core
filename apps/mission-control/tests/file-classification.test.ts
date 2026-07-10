import { describe, expect, it } from "vitest";
import { classifyFilename } from "@/lib/services/company-classification";

describe("file classification", () => {
  it("classifies paid ads exports with marketing extraction hints", () => {
    const result = classifyFilename("Meta Ads ROAS creative fatigue May.csv");

    expect(result.department).toBe("Marketing");
    expect(result.sourceType).toBe("ad_performance");
    expect(result.sensitivity).toBe("internal");
    expect(result.extractionHints).toContain("ROAS");
    expect(result.extractionHints).toContain("campaign status");
    expect(result.evidenceWarnings?.join(" ")).toMatch(/creative fatigue|attribution/i);
  });

  it("classifies WhatsApp Business exports as confidential comms evidence", () => {
    const result = classifyFilename("WhatsApp Business contact list export.xlsx");

    expect(result.department).toBe("Marketing");
    expect(result.sourceType).toBe("whatsapp_business");
    expect(result.sensitivity).toBe("confidential");
    expect(result.extractionHints).toContain("opt-out indicators");
  });

  it("classifies local business profile exports for location-led companies", () => {
    const result = classifyFilename("Google Business Profile direction requests reviews.csv");

    expect(result.department).toBe("Marketing");
    expect(result.sourceType).toBe("local_business");
    expect(result.extractionHints).toContain("direction requests");
  });

  it("classifies local ad reports for owner-operated businesses", () => {
    const result = classifyFilename("Meta radius campaign WhatsApp response rate branch 1.csv");

    expect(result.department).toBe("Marketing");
    expect(result.sourceType).toBe("local_ad_performance");
    expect(result.extractionHints).toContain("response rate");
    expect(result.evidenceWarnings?.join(" ")).toMatch(/calls|visits|WhatsApp/i);
    expect(result.extractionHints).toContain("location label");
  });

  it("classifies email CRM exports for lifecycle marketing", () => {
    const result = classifyFilename("Klaviyo email campaign export.csv");

    expect(result.department).toBe("Marketing");
    expect(result.sourceType).toBe("email_crm");
    expect(result.extractionHints).toContain("unsubscribe rate");
  });

  it("keeps regulated-sector sensitivity elevation for non-public files", () => {
    const result = classifyFilename("monthly operations report.xlsx", "financial_services");

    expect(result.department).toBe("Operations");
    expect(result.sensitivity).toBe("confidential");
  });
});
