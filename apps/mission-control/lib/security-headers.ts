import { NextRequest, NextResponse } from "next/server";
import { productOrigins } from "@/lib/product-detection";

export function parseAllowedOrigins(input: string | undefined): string[] {
  return (input ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const PRODUCTION_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
const ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  ...parseAllowedOrigins(process.env.NEXUS_EXTRA_CORS_ORIGINS ?? process.env.NEXUS_EXTRA_CORS_ORIGIN),
  ...productOrigins().map((origin) => `https://${origin}`),
].filter(Boolean));

const CLERK_DOMAIN = (process.env.NEXT_PUBLIC_CLERK_DOMAIN ?? "clerk.accounts.dev").replace(/\/+$/, "");

/**
 * Build the CSP. When a nonce is supplied, script-src carries `'nonce-<v>'`
 * instead of `'unsafe-inline'`, which is the directive that actually matters
 * for XSS: an injected inline `<script>` no longer executes.
 *
 * Deliberately NOT using `'strict-dynamic'`. That would make browsers ignore
 * the host allowlist, and Clerk's hosted auth and Cloudflare challenge scripts
 * are allowlisted by host. Nonce plus host allowlist is the lower-risk pairing
 * here.
 *
 * style-src keeps 'unsafe-inline'. Tailwind and React inline styles depend on
 * it, and removing it is a separate piece of work with no XSS-execution
 * benefit comparable to locking down script-src.
 */
export function cspDirectives(nonce?: string): string {
  const scriptSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
    // next dev's HMR and React refresh need eval; production never gets it.
    process.env.NODE_ENV === "production" ? null : "'unsafe-eval'",
    `https://${CLERK_DOMAIN}`,
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
  ].filter(Boolean);

  return [
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.anthropic.com https://api.deepseek.com https://*.clerk.accounts.dev https://${CLERK_DOMAIN} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io wss:`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Nonce-less policy, kept as a named export for tests and for any caller that
 * renders outside the middleware request path.
 */
export const CSP_DIRECTIVES = cspDirectives();

export function securityHeaderEntries(nonce?: string): Array<{ key: string; value: string }> {
  const entries = [
    { key: "x-content-type-options", value: "nosniff" },
    { key: "x-frame-options", value: "DENY" },
    { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
    { key: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "cross-origin-opener-policy", value: "same-origin-allow-popups" },
    { key: "content-security-policy", value: cspDirectives(nonce) },
  ];

  if (process.env.NODE_ENV === "production") {
    entries.push({
      key: "strict-transport-security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  }

  return entries;
}

export function withSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce?: string
): NextResponse {
  for (const { key, value } of securityHeaderEntries(nonce)) response.headers.set(key, value);

  const origin = request.headers.get("origin") ?? "";
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (process.env.NODE_ENV !== "production" || ALLOWED_ORIGINS.has(origin)) {
      response.headers.set("access-control-allow-origin", origin || "*");
      response.headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("access-control-allow-headers", "authorization, content-type, x-workspace-id");
      response.headers.set("access-control-max-age", "86400");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}
