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

type ClerkCspConfig = {
  frontendDomain?: string;
  hostedSignInUrl?: string;
  hostedSignUpUrl?: string;
};

/**
 * Host (with port when non-default) from a URL or bare hostname.
 *
 * A CSP host-source without a port means the scheme's default port, so dropping
 * a non-443 port produces an allowlist entry that can never match — and the
 * failure is invisible, appearing only as a console violation.
 */
function hostnameFromUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:") return null;
    // A single-slash typo (`https:/clerk.pinavia.io`) does not throw: it has no
    // "://", gets the prefix, and parses to the hostname "https". Requiring a
    // dot rejects that and every similar typo, so a misconfiguration falls back
    // to a working default instead of allowlisting a host that cannot exist.
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return null;
  }
}

/** Clerk's browser SDK and hosted auth can use distinct custom domains. */
export function clerkCspHosts(config: ClerkCspConfig = {}): string[] {
  // `??` only catches undefined/null. An env var set to "" — what an operator
  // gets from a blank Render field or a bare `NEXT_PUBLIC_CLERK_DOMAIN=` line —
  // is a defined empty string, so the default never applied and EVERY Clerk
  // host dropped out of the allowlist. Auth then breaks with nothing but a
  // console violation to show for it. Normalise with `||`, and fall back after
  // parsing as well so a malformed value (`https:/clerk.pinavia.io`) still
  // yields a usable policy instead of an empty one.
  const frontend =
    config.frontendDomain?.trim() || process.env.NEXT_PUBLIC_CLERK_DOMAIN?.trim() || "";

  return [
    ...new Set(
      [
        hostnameFromUrl(frontend) ?? "clerk.accounts.dev",
        hostnameFromUrl(
          config.hostedSignInUrl?.trim() || process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL
        ),
        hostnameFromUrl(
          config.hostedSignUpUrl?.trim() || process.env.NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL
        ),
      ].filter((host): host is string => Boolean(host))
    ),
  ];
}

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
 *
 * Analytics origin, allowlisted ONLY when analytics is actually switched on.
 * Keeping this env-gated means the default policy stays as tight as it is
 * today and we do not advertise a third-party script origin we are not using.
 * Mirrors components/analytics.tsx — if that component's src changes, this
 * must change with it or the tag is blocked silently.
 */
function analyticsScriptOrigin(): string | null {
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

export function cspDirectives(nonce?: string, clerkConfig?: ClerkCspConfig): string {
  const clerkSources = clerkCspHosts(clerkConfig).map((host) => `https://${host}`);
  const analyticsOrigin = analyticsScriptOrigin();
  const scriptSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
    // next dev's HMR and React refresh need eval; production never gets it.
    process.env.NODE_ENV === "production" ? null : "'unsafe-eval'",
    ...clerkSources,
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
    analyticsOrigin,
  ].filter(Boolean);

  return [
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.anthropic.com https://api.deepseek.com https://*.clerk.accounts.dev ${clerkSources.join(" ")} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${analyticsOrigin ? ` ${analyticsOrigin}` : ""} wss:`,
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

export function securityHeaderEntries(
  nonce?: string,
  /** Prebuilt policy. The middleware already built one for the request header;
   *  passing it through avoids rebuilding the same string from env per request. */
  csp?: string
): Array<{ key: string; value: string }> {
  const entries = [
    { key: "x-content-type-options", value: "nosniff" },
    { key: "x-frame-options", value: "DENY" },
    { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
    { key: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "cross-origin-opener-policy", value: "same-origin-allow-popups" },
    { key: "content-security-policy", value: csp ?? cspDirectives(nonce) },
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
  nonce?: string,
  csp?: string
): NextResponse {
  for (const { key, value } of securityHeaderEntries(nonce, csp)) response.headers.set(key, value);

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
