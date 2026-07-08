/**
 * Sentry reporting helper for error paths that are deliberately swallowed
 * at the call site (e.g. webhook handlers that must always return 200,
 * fire-and-forget background jobs, fully-exhausted LLM fallback chains).
 *
 * The Sentry runtime entrypoints are disabled in the demo build path because
 * Next 15 middleware builds were hanging while bundling Sentry/OpenTelemetry.
 * Keep these helpers as safe no-ops so call sites do not need branching.
 *
 * Task #32 — production error tracking.
 */

export function captureHandledError(
  err: unknown,
  context: { route: string; errorType: string; workspaceId?: string; extra?: Record<string, unknown> }
): void {
  void err;
  void context;
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
  void message;
  void context;
}
