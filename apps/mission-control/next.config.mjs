/** @type {import('next').NextConfig} */
const clerkDomain = (process.env.NEXT_PUBLIC_CLERK_DOMAIN ?? "clerk.accounts.dev").replace(/\/+$/, "");

const cspDirectives = [
  "default-src 'self'",
  process.env.NODE_ENV === "production"
    ? `script-src 'self' 'unsafe-inline' https://${clerkDomain} https://*.clerk.accounts.dev https://challenges.cloudflare.com`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${clerkDomain} https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.anthropic.com https://api.deepseek.com https://*.clerk.accounts.dev https://${clerkDomain} https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io wss:`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "x-content-type-options", value: "nosniff" },
  { key: "x-frame-options", value: "DENY" },
  { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
  { key: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "cross-origin-opener-policy", value: "same-origin-allow-popups" },
  { key: "content-security-policy", value: cspDirectives },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "strict-transport-security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig = {
  // Vault watching is an optional Node-only capability. Keep Chokidar and its
  // platform-specific fsevents binary out of webpack's server bundle; they are
  // loaded at runtime only when NEXUS_VAULT_SYNC enables the watcher.
  serverExternalPackages: ["chokidar", "fsevents"],
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/.vite*/**/*",
      "./node_modules/@sentry/**/*",
      "./node_modules/react-force-graph-2d/**/*",
      "./node_modules/force-graph/**/*",
      "./node_modules/d3*/**/*",
      "./node_modules/@uiw/**/*",
      "./node_modules/@codemirror/**/*",
      "./node_modules/vitest/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const sentryBuildEnabled =
  process.env.NEXUS_ENABLE_SENTRY === "true" &&
  Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_AUTH_TOKEN);

let config = nextConfig;

if (sentryBuildEnabled) {
  const { withSentryConfig } = await import("@sentry/nextjs");

  config = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    // Avoid uploading source maps without an auth token (e.g. local dev, sandboxes).
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
    },
    // Routes /monitoring through the app so ad-blockers don't strip Sentry's beacon.
    tunnelRoute: "/monitoring",
    disableLogger: true,
    automaticVercelMonitors: false,
  });
}

export default config;
