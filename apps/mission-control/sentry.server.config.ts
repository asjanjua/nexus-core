/**
 * Sentry initialization for the Node.js server runtime (API routes, server
 * components, route handlers). Loaded from instrumentation.ts via
 * `await import("./sentry.server.config")` when NEXT_RUNTIME === "nodejs".
 *
 * Task #32 — production error tracking.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NEXUS_ENV ?? process.env.NODE_ENV ?? "development",

  // 100% trace sampling in all environments. At pilot volume (<1000 transactions/day)
  // full tracing costs nothing meaningful and gives complete visibility. Revisit and
  // dial down once past ~50 paying workspaces.
  tracesSampleRate: 1.0,

  // Don't spam Sentry with noisy, expected, non-actionable errors.
  ignoreErrors: [
    /missing_signature/,
    /invalid_signature/,
  ],

  beforeSend(event) {
    // Strip Authorization / cookie headers before they ever leave the process.
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>)["authorization"];
      delete (event.request.headers as Record<string, unknown>)["cookie"];
    }
    return event;
  },
});
