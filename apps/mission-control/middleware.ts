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
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that are always public (no auth required at all)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/login",                    // legacy - kept for graceful deprecation response
  "/api/auth/logout",                   // legacy - kept for graceful deprecation response
  "/api/oauth/token",                   // agent OAuth token endpoint
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
  "/api/settings(.*)",
  "/api/connectors(.*)",  // includes install, callback, and list/revoke
  "/api/workspace(.*)",
]);

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export default clerkMiddleware(async (auth, request) => {
  // Let public routes through unconditionally
  if (isPublicRoute(request)) return withSecurityHeaders(NextResponse.next());

  // If the request carries a Bearer token on an agent-compatible route,
  // pass it through — the route handler performs token validation.
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && isAgentApiRoute(request)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // All other routes require a Clerk session
  await auth.protect();
  return withSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files per Clerk's recommended pattern
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
