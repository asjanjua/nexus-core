import { describe, expect, it } from "vitest";
import { applicationOrigin, hostedClerkUrl } from "@/lib/auth/hosted-clerk-url";

describe("hosted Clerk URL handoff", () => {
  it("builds an absolute redirect back to the active application host", () => {
    const appOrigin = applicationOrigin({
      host: "app.pinavia.co",
      forwardedProto: "https"
    });

    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.co/sign-in",
      redirectPath: "/dashboard/ceo",
      appOrigin
    })).toBe(
      "https://accounts.pinavia.co/sign-in?redirect_url=https%3A%2F%2Fapp.pinavia.co%2Fdashboard%2Fceo"
    );
  });

  it("uses the configured application URL when request host headers are unavailable", () => {
    const appOrigin = applicationOrigin({
      configuredAppUrl: "https://app.pinavia.co/some/path"
    });

    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.co/sign-up",
      redirectPath: "/onboarding",
      appOrigin
    })).toContain("redirect_url=https%3A%2F%2Fapp.pinavia.co%2Fonboarding");
  });

  it("rejects cross-origin redirect paths", () => {
    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.co/sign-in",
      redirectPath: "https://evil.example/steal",
      appOrigin: "https://app.pinavia.co"
    })).toBeNull();
  });
});
