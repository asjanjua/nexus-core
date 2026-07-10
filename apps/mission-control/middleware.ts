import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { productFromHost } from "@/lib/product-detection";
import { withSecurityHeaders } from "@/lib/security-headers";

function appResponse(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nexus-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-nexus-product", productFromHost(request.headers.get("host") ?? ""));
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
  const response = appResponse(request);
  return withSecurityHeaders(response, request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
