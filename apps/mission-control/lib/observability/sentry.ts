/**
 * Sentry reporting helper for error paths that are deliberately swallowed
 * at the call site (e.g. webhook handlers that must always return 200,
 * fire-and-forget background jobs, fully-exhausted LLM fallback chains).
 *
 * The Sentry runtime entrypoints are disabled in the demo build path because
 * Next 15 middleware builds were hanging while bundling Sentry/OpenTelemetry.
 * These helpers therefore do not report to Sentry — but they are no longer
 * silent. They write a structured line to stderr, which Render captures, so a
 * swallowed failure leaves a trace somewhere instead of vanishing entirely.
 * No Sentry import is involved, so the build path is unaffected.
 *
 * Only route, errorType, workspaceId and the error message are logged. Payloads
 * are deliberately excluded: callers pass audit events and webhook bodies that
 * can carry customer PII, and this output goes to a plaintext log.
 *
 * Task #32 — production error tracking.
 */

type ReportContext = {
  route: string;
  errorType: string;
  workspaceId?: string;
  extra?: Record<string, unknown>;
};

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown_error";
}

function report(level: "error" | "warn", detail: string, context: ReportContext): void {
  const parts = [
    `[observability] ${context.errorType}`,
    `route=${context.route}`,
    context.workspaceId ? `workspace=${context.workspaceId}` : null,
    `detail=${detail}`,
  ].filter(Boolean);
  console[level](parts.join(" "));
}

export function captureHandledError(err: unknown, context: ReportContext): void {
  report("error", messageOf(err), context);
}

/**
 * For exhausted/degraded states that aren't a thrown JS error but are still
 * worth knowing about in production (e.g. every provider in an LLM fallback
 * chain failed). Reported as a message, not an exception.
 */
export function captureDegradedState(message: string, context: ReportContext): void {
  report("warn", message, context);
}
