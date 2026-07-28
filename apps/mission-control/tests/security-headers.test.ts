/**
 * Security headers — regression lock (BACKLOG P1).
 *
 * The app already ships an A-grade header set (HSTS preload, nosniff, frame
 * DENY, Referrer-Policy, Permissions-Policy, strict CSP). This test pins that
 * set so a future security-header edit cannot silently drop a header and regress the
 * securityheaders.com grade before a pilot. It calls the real
 * `withSecurityHeaders` helper used by the app header config.
 */

import { describe, expect, it, afterEach, beforeAll, afterAll, vi } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clerkCspHosts,
  cspDirectives,
  withSecurityHeaders,
  CSP_DIRECTIVES,
  parseAllowedOrigins,
} from "@/lib/security-headers";

function fakeRequest(path = "/dashboard/ceo", init?: { method?: string; origin?: string }): NextRequest {
  const headers = new Headers();
  if (init?.origin) headers.set("origin", init.origin);
  return {
    method: init?.method ?? "GET",
    nextUrl: { pathname: path },
    headers,
  } as unknown as NextRequest;
}

describe("Security headers", () => {
  it("parses comma-separated extra CORS origins for domain cutovers", () => {
    expect(
      parseAllowedOrigins(" https://app.pinavia.io/, https://nexus-mission-control.onrender.com ")
    ).toEqual([
      "https://app.pinavia.io",
      "https://nexus-mission-control.onrender.com",
    ]);
  });

  it("sets the core hardening headers on every response", () => {
    const res = withSecurityHeaders(NextResponse.next(), fakeRequest());
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toContain("geolocation=()");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
  });

  it("CSP locks down framing, objects, and base-uri", () => {
    expect(CSP_DIRECTIVES).toContain("frame-ancestors 'none'");
    expect(CSP_DIRECTIVES).toContain("object-src 'none'");
    expect(CSP_DIRECTIVES).toContain("base-uri 'self'");
    expect(CSP_DIRECTIVES).toContain("form-action 'self'");
    expect(CSP_DIRECTIVES).toContain("default-src 'self'");
  });

  it("uses a nonce instead of unsafe-inline for scripts when one is supplied", async () => {
    const { cspDirectives } = await import("@/lib/security-headers");
    const withNonce = cspDirectives("test-nonce-value");

    const scriptSrc = withNonce.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toContain("'nonce-test-nonce-value'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("keeps the Clerk host allowlist rather than relying on strict-dynamic", async () => {
    // strict-dynamic would make browsers ignore these hosts and break hosted auth.
    const { cspDirectives } = await import("@/lib/security-headers");
    const withNonce = cspDirectives("n");
    const scriptSrc = withNonce.split("; ").find((d) => d.startsWith("script-src"))!;

    expect(scriptSrc).not.toContain("strict-dynamic");
    expect(scriptSrc).toContain("https://challenges.cloudflare.com");
  });

  it("allows separate Clerk frontend API and hosted-auth custom domains", () => {
    const config = {
      frontendDomain: "clerk.pinavia.co",
      hostedSignInUrl: "https://accounts.pinavia.co/sign-in",
      hostedSignUpUrl: "https://accounts.pinavia.co/sign-up",
    };
    const hosts = clerkCspHosts(config);
    const csp = cspDirectives("n", config);

    expect(hosts).toEqual(["clerk.pinavia.co", "accounts.pinavia.co"]);
    expect(csp).toContain("https://clerk.pinavia.co");
    expect(csp).toContain("https://accounts.pinavia.co");
  });

  it("keeps style-src unsafe-inline, which Tailwind and React inline styles need", async () => {
    const { cspDirectives } = await import("@/lib/security-headers");
    expect(cspDirectives("n")).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("allowlists Plausible only when cookieless analytics is enabled", () => {
    const previous = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    try {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "pinavia.io";
      const enabled = cspDirectives("n");
      const enabledScriptSrc = enabled.split("; ").find((d) => d.startsWith("script-src"))!;
      const enabledConnectSrc = enabled.split("; ").find((d) => d.startsWith("connect-src"))!;

      expect(enabledScriptSrc).toContain("https://plausible.io");
      expect(enabledConnectSrc).toContain("https://plausible.io");

      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
      const disabled = cspDirectives("n");

      expect(disabled).not.toContain("https://plausible.io");
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
      } else {
        process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = previous;
      }
    }
  });

  it("CSP allows Clerk's Cloudflare challenge resources for social auth", () => {
    expect(CSP_DIRECTIVES).toContain("script-src");
    expect(CSP_DIRECTIVES).toContain("https://challenges.cloudflare.com");
    expect(CSP_DIRECTIVES).toContain("frame-src https://challenges.cloudflare.com");
    expect(CSP_DIRECTIVES).toContain("worker-src 'self' blob:");
  });

  describe("in production", () => {
    beforeAll(() => {
      vi.stubEnv("NODE_ENV", "production");
    });
    afterAll(() => {
      vi.unstubAllEnvs();
    });

    it("emits HSTS with preload", () => {
      const res = withSecurityHeaders(NextResponse.next(), fakeRequest());
      const hsts = res.headers.get("strict-transport-security");
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");
    });

    it("does not wildcard CORS for API routes with an unknown origin", () => {
      const res = withSecurityHeaders(NextResponse.next(), fakeRequest("/api/ask"));
      // Unknown origin in production must not be echoed or wildcarded.
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("returns a 204 preflight and echoes allowed product origins", () => {
      const res = withSecurityHeaders(
        NextResponse.next(),
        fakeRequest("/api/ask", { method: "OPTIONS", origin: "https://app.pinavia.co" })
      );
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("https://app.pinavia.co");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });
  });
});

/**
 * The env-var path is the only path production uses: `cspDirectives(nonce)` is
 * called with no config from `securityHeaderEntries` and `middleware.ts`. The
 * existing cases all pass an explicit config, so the branch that actually
 * shipped had no coverage and the regression could recur silently.
 */
describe("clerkCspHosts from environment", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("falls back to the default when NEXT_PUBLIC_CLERK_DOMAIN is an empty string", () => {
    process.env.NEXT_PUBLIC_CLERK_DOMAIN = "";
    delete process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL;
    delete process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL;

    // A blank Render field must never empty the allowlist.
    expect(clerkCspHosts()).toContain("clerk.accounts.dev");
  });

  it("falls back on a single-slash typo instead of allowlisting garbage", () => {
    // Does not throw: no "://", so it gets the prefix and parses to hostname
    // "https", which would silently enter the policy as a dead entry.
    process.env.NEXT_PUBLIC_CLERK_DOMAIN = "https:/clerk.pinavia.io";
    const hosts = clerkCspHosts();
    expect(hosts).toContain("clerk.accounts.dev");
    expect(hosts).not.toContain("https");
  });

  it("reads both custom hosts from the environment", () => {
    process.env.NEXT_PUBLIC_CLERK_DOMAIN = "clerk.pinavia.io";
    process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL = "https://accounts.pinavia.io/sign-in";
    delete process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL;

    const hosts = clerkCspHosts();
    expect(hosts).toContain("clerk.pinavia.io");
    expect(hosts).toContain("accounts.pinavia.io");
  });

  it("preserves a non-default port so the entry can actually match", () => {
    expect(clerkCspHosts({ hostedSignInUrl: "https://accounts.pinavia.io:8443/sign-in" })).toContain(
      "accounts.pinavia.io:8443"
    );
  });
});
