import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { productFromHost } from "@/lib/product-detection";
import { cspDirectives, withSecurityHeaders } from "@/lib/security-headers";

function appResponse(request: NextRequest, nonce: string, csp: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nexus-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-nexus-product", productFromHost(request.headers.get("host") ?? ""));
  // Next reads the nonce off the request's own CSP header and stamps it onto
  // the framework's inline bootstrap/hydration scripts. Without this the
  // nonce-based policy would block Next's own scripts. x-nonce is the
  // conventional name for server components that need to read it directly.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Clerk must run on every application/API request that can call auth().
 * Authorization remains inside route handlers through requireScope(), which
 * also supports Nexus bearer tokens. Keeping this middleware intentionally
 * small avoids reintroducing the build-heavy request instrumentation removed
 * in 68a5a0b while restoring Clerk's server auth context.
 */
export default clerkMiddleware((_auth, request) => {
  // Per-request nonce so script-src can drop 'unsafe-inline'. crypto.randomUUID
  // is available on the edge runtime; no Node crypto import is pulled in.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // Built once and reused. The request header and the response header were each
  // calling cspDirectives(), so every request rebuilt the same policy string
  // from process.env twice.
  const csp = cspDirectives(nonce);
  const response = appResponse(request, nonce, csp);
  return withSecurityHeaders(response, request, nonce, csp);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
