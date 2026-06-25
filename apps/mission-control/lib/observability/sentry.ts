/**
 * Sentry reporting helper for error paths that are deliberately swallowed
 * at the call site (e.g. webhook handlers that must always return 200,
 * fire-and-forget background jobs, fully-exhausted LLM fallback chains).
 *
 * Automatic coverage (uncaught exceptions in route handlers, server
 * components, and middleware) comes from instrumentation.ts's
 * onRequestError hook and needs no per-route wiring. This helper is only
 * for the minority of cases where the app intentionally catches an error
 * and continues — those errors are invisible to onRequestError because
 * nothing actually throws past the route handler.
 *
 * Task #32 — production error tracking.
 */
import * as Sentry from "@sentry/nextjs";

export function captureHandledError(
  err: unknown,
  context: { route: string; errorType: string; workspaceId?: string; extra?: Record<string, unknown> }
): void {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    scope.setTag("errorType", context.errorType);
    if (context.workspaceId) scope.setTag("workspaceId", context.workspaceId);
    if (context.extra) scope.setContext("details", context.extra);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}

/**
 * For exhausted/degraded states that aren't a thrown JS error but are still
 * worth knowing about in production (e.g. every provider in an LLM fallback
 * chain failed). Reported as a message, not an exception.
 */
export function captureDegradedState(
  message: string,
  context: { route: string; errorType: string; workspaceId?: string; extra?: Record<string, unknown> }
): void {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    scope.setTag("errorType", context.errorType);
    scope.setLevel("warning");
    if (context.workspaceId) scope.setTag("workspaceId", context.workspaceId);
    if (context.extra) scope.setContext("details", context.extra);
    Sentry.captureMessage(message);
  });
}
