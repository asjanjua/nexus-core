/**
 * Sentry initialization for the browser runtime. Next.js 15.3+ auto-loads
 * this file for client instrumentation (replaces the older sentry.client.config.ts
 * pattern; required for Turbopack compatibility).
 *
 * Task #32 — production error tracking.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_NEXUS_ENV ?? process.env.NODE_ENV ?? "development",

  // Pilot-stage traffic is low; sample generously without being wasteful.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session replay is off by default — turn on deliberately if/when needed,
  // since it captures DOM content and could leak client evidence text.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
