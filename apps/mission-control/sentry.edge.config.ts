/**
 * Sentry initialization for the Edge runtime (middleware.ts).
 * Loaded from instrumentation.ts via `await import("./sentry.edge.config")`
 * when NEXT_RUNTIME === "edge".
 *
 * Task #32 — production error tracking.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NEXUS_ENV ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
