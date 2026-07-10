/**
 * Security headers — regression lock (BACKLOG P1).
 *
 * The app already ships an A-grade header set (HSTS preload, nosniff, frame
 * DENY, Referrer-Policy, Permissions-Policy, strict CSP). This test pins that
 * set so a future security-header edit cannot silently drop a header and regress the
 * securityheaders.com grade before a pilot. It calls the real
 * `withSecurityHeaders` helper used by the app header config.
 */

import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withSecurityHeaders, CSP_DIRECTIVES, parseAllowedOrigins } from "@/lib/security-headers";

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
