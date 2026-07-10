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

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  process.env.NODE_ENV === "production"
    ? `script-src 'self' 'unsafe-inline' https://${CLERK_DOMAIN} https://*.clerk.accounts.dev https://challenges.cloudflare.com`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${CLERK_DOMAIN} https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
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

export function securityHeaderEntries(): Array<{ key: string; value: string }> {
  const entries = [
    { key: "x-content-type-options", value: "nosniff" },
    { key: "x-frame-options", value: "DENY" },
    { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
    { key: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "cross-origin-opener-policy", value: "same-origin-allow-popups" },
    { key: "content-security-policy", value: CSP_DIRECTIVES },
  ];

  if (process.env.NODE_ENV === "production") {
    entries.push({
      key: "strict-transport-security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  }

  return entries;
}

export function withSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  for (const { key, value } of securityHeaderEntries()) response.headers.set(key, value);

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
