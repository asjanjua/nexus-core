/**
 * Security headers — regression lock (BACKLOG P1).
 *
 * The app already ships an A-grade header set (HSTS preload, nosniff, frame
 * DENY, Referrer-Policy, Permissions-Policy, strict CSP). This test pins that
 * set so a future middleware edit cannot silently drop a header and regress the
 * securityheaders.com grade before a pilot. It calls the real
 * `withSecurityHeaders` exported from middleware.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withSecurityHeaders, CSP_DIRECTIVES } from "@/middleware";

function fakeRequest(path = "/dashboard/ceo"): NextRequest {
  return {
    method: "GET",
    nextUrl: { pathname: path },
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("Security headers", () => {
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

  describe("in production", () => {
    const prev = process.env.NODE_ENV;
    beforeAll(() => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    });
    afterAll(() => {
      Object.defineProperty(process.env, "NODE_ENV", { value: prev, configurable: true });
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
  });
});
