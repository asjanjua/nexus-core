import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applicationOrigin, hostedClerkUrl, safeAppRedirectPath } from "@/lib/auth/hosted-clerk-url";

const rootLayoutSource = readFileSync(
  fileURLToPath(new URL("../app/layout.tsx", import.meta.url)),
  "utf8"
);

describe("Clerk redirect safety", () => {
  it("builds an absolute redirect back to the active application host", () => {
    const appOrigin = applicationOrigin({
      host: "app.pinavia.io",
      forwardedProto: "https"
    });

    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.io/sign-in",
      redirectPath: "/dashboard/ceo",
      appOrigin
    })).toBe(
      "https://accounts.pinavia.io/sign-in?redirect_url=https%3A%2F%2Fapp.pinavia.io%2Fdashboard%2Fceo"
    );
  });

  it("uses the configured application URL when request host headers are unavailable", () => {
    const appOrigin = applicationOrigin({
      configuredAppUrl: "https://app.pinavia.io/some/path"
    });

    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.io/sign-up",
      redirectPath: "/onboarding",
      appOrigin
    })).toContain("redirect_url=https%3A%2F%2Fapp.pinavia.io%2Fonboarding");
  });

  it("rejects cross-origin redirect paths", () => {
    expect(hostedClerkUrl({
      configuredUrl: "https://accounts.pinavia.io/sign-in",
      redirectPath: "https://evil.example/steal",
      appOrigin: "https://app.pinavia.io"
    })).toBeNull();
  });

  it("preserves a first-party invite return path through hosted Clerk", () => {
    expect(safeAppRedirectPath("/invite/accept?code=single-use-code", "/dashboard/ceo")).toBe(
      "/invite/accept?code=single-use-code"
    );
  });

  it("rejects protocol-relative and external return paths", () => {
    expect(safeAppRedirectPath("//evil.example/steal", "/dashboard/ceo")).toBe("/dashboard/ceo");
    expect(safeAppRedirectPath("https://evil.example/steal", "/dashboard/ceo")).toBe("/dashboard/ceo");
  });

  it("keeps the Clerk session provider and renders embedded, redirect-bound authentication", () => {
    expect(rootLayoutSource).toContain('import { ClerkProvider } from "@clerk/nextjs"');
    expect(rootLayoutSource).toContain("<ClerkProvider");
    const signInSource = readFileSync(
      fileURLToPath(new URL("../app/sign-in/[[...sign-in]]/page.tsx", import.meta.url)),
      "utf8"
    );
    const signUpSource = readFileSync(
      fileURLToPath(new URL("../app/sign-up/[[...sign-up]]/page.tsx", import.meta.url)),
      "utf8"
    );
    expect(signInSource).toContain('import { SignIn } from "@clerk/nextjs"');
    expect(signInSource).toContain("forceRedirectUrl={redirectPath}");
    expect(signUpSource).toContain('import { SignUp } from "@clerk/nextjs"');
    expect(signUpSource).toContain("forceRedirectUrl={redirectPath}");
  });
});
