/**
 * NexusAI Mission Control — request middleware.
 *
 * Auth strategy:
 *   Browser / human users  → Clerk session (cookie managed by Clerk SDK)
 *   Agent / API key callers → Bearer token (validated inside route handlers via lib/api-auth.ts)
 *
 * Clerk's clerkMiddleware is the outer layer. It handles:
 *   - Redirecting unauthenticated users to /sign-in
 *   - Injecting auth context into server components and API routes
 *
 * Bearer-authenticated routes bypass Clerk's redirect so agents are never
 * sent to the sign-in page. Route handlers validate the token themselves.
 *
 * Security layer (withSecurityHeaders):
 *   - Full CSP with nonce-free strict policy for the app shell
 *   - CORS: production domain only (never wildcard)
 *   - Standard hardening headers already present
 *
 * Rate limiting (withRateLimit):
 *   - In-process sliding window per IP
 *   - Auth routes: 10 req/min, Ingestion: 20/min, Ask: 30/min, Dashboard: 60/min
 *   - Returns 429 with Retry-After when limit exceeded
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Routes that are always public (no auth required at all)
const isPublicRoute = createRouteMatcher([
  "/",
  "/product-brief(.*)",
  "/start-pilot",
  "/workspace",
  "/readiness(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/security(.*)",
  "/acceptable-use(.*)",
  "/data-processing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/login",                    // legacy - kept for graceful deprecation response
  "/api/auth/logout",                   // legacy - kept for graceful deprecation response
  "/api/oauth/token",                   // agent OAuth token endpoint
  "/api/readiness/submit",              // public readiness lead capture
  "/api/health(.*)",
  "/api/connectors/slack/callback(.*)", // OAuth redirect — Slack hits this without a session
]);

// API routes that accept Bearer tokens — Clerk should NOT redirect these
// because agents don't have a browser session. Route handlers validate the token.
const isAgentApiRoute = createRouteMatcher([
  "/api/dashboard(.*)",
  "/api/recommendations(.*)",
  "/api/evidence(.*)",
  "/api/ask(.*)",
  "/api/ingestion(.*)",
  "/api/approvals(.*)",
  "/api/auth/me(.*)",
  "/api/agent-keys(.*)",
  "/api/agent-control-profiles(.*)",
  "/api/agent-outputs(.*)",
  "/api/decisions(.*)",
  "/api/actions(.*)",
  "/api/learning-signals(.*)",
  "/api/settings(.*)",
  "/api/connectors(.*)",  // includes install, callback, and list/revoke
  "/api/workspace(.*)",
]);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

const PRODUCTION_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
const ALLOWED_ORIGINS = new Set(
  [
    PRODUCTION_ORIGIN,
    process.env.NEXUS_EXTRA_CORS_ORIGIN ?? "",
  ].filter(Boolean)
);

// CSP: strict but pragmatic for a Next.js app with Clerk and inline styles from Tailwind
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js injects inline scripts; use strict-dynamic to allow them via nonces in future
  // For now allow 'unsafe-inline' only in development; production gets 'strict-dynamic'
  process.env.NODE_ENV === "production"
    ? "script-src 'self' https://clerk.nexusai.io https://*.clerk.accounts.dev 'strict-dynamic'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",   // Tailwind generates inline styles
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.anthropic.com https://api.deepseek.com https://*.clerk.accounts.dev https://clerk.nexusai.io wss:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

function withSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  // Standard hardening
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("content-security-policy", CSP_DIRECTIVES);

  if (process.env.NODE_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  }

  // CORS — only for /api/* routes; never wildcard in production
  const origin = request.headers.get("origin") ?? "";
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (process.env.NODE_ENV !== "production" || ALLOWED_ORIGINS.has(origin)) {
      response.headers.set("access-control-allow-origin", origin || "*");
      response.headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("access-control-allow-headers", "authorization, content-type, x-workspace-id");
      response.headers.set("access-control-max-age", "86400");
    }
    // Preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Rate limiting — in-process sliding window per IP
// ---------------------------------------------------------------------------

type RateLimitBucket = { windowStart: number; count: number };
const rateLimitStore = new Map<string, RateLimitBucket>();

type RateLimitRule = { pattern: RegExp; maxPerMinute: number };

const RATE_LIMIT_RULES: RateLimitRule[] = [
  { pattern: /^\/api\/auth/,        maxPerMinute: 10 },
  { pattern: /^\/api\/readiness/,   maxPerMinute: 12 },
  { pattern: /^\/api\/ingestion/,   maxPerMinute: 20 },
  { pattern: /^\/api\/ask/,         maxPerMinute: 30 },
  { pattern: /^\/api\/dashboard/,   maxPerMinute: 60 },
];

function checkRateLimit(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const rule = RATE_LIMIT_RULES.find((r) => r.pattern.test(path));
  if (!rule) return null;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `${ip}:${rule.pattern.source}`;
  const now = Date.now();
  const WINDOW = 60_000; // 1 minute

  const bucket = rateLimitStore.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > rule.maxPerMinute) {
    const retryAfter = Math.ceil((WINDOW - (now - bucket.windowStart)) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "rate_limited", retryAfterSeconds: retryAfter }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfter),
          "x-ratelimit-limit": String(rule.maxPerMinute),
          "x-ratelimit-remaining": "0",
        },
      }
    );
  }
  return null;
}

export default clerkMiddleware(async (auth, request) => {
  // Rate limit check — runs before auth to block hammering without auth context
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Let public routes through unconditionally
  if (isPublicRoute(request)) return withSecurityHeaders(NextResponse.next(), request);

  // If the request carries a Bearer token on an agent-compatible route,
  // pass it through — the route handler performs token validation.
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && isAgentApiRoute(request)) {
    return withSecurityHeaders(NextResponse.next(), request);
  }

  // All other routes require a Clerk session
  await auth.protect();
  return withSecurityHeaders(NextResponse.next(), request);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files per Clerk's recommended pattern
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
