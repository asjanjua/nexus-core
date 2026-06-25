import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

// withSentryConfig is a no-op wrapper at runtime if SENTRY_DSN is unset; it only
// adds value at build time (source map upload) when SENTRY_AUTH_TOKEN is present.
export default withSentryConfig(nextConfig, {
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
