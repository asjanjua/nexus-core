/**
 * Next.js instrumentation entrypoint. Runs once per server runtime at boot
 * and exposes onRequestError, which Next.js 15 calls for every uncaught
 * server-side error (route handlers, server components, server actions,
 * middleware) — this is what gives Sentry coverage across the app without
 * having to manually wrap each of the ~36 API route handlers.
 *
 * Task #32 — production error tracking.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Best-effort workspace resolution for tagging. The x-workspace-id header is
 * only set by authenticated client fetches, so it is absent precisely on the
 * errors that matter most for triage: auth failures, CORS preflight, 429s
 * from the rate limiter, and malformed requests that fail before any route
 * handler resolves workspace context.
 *
 * Fallback order: header -> ?workspaceId= query param (several GET routes
 * pass it this way, e.g. /api/settings/workspace) -> explicit "unknown" so
 * Sentry dashboards can distinguish "no workspace could be resolved" from
 * "we forgot to tag this" at a glance.
 */
function resolveWorkspaceId(request: {
  path: string;
  headers: Record<string, string>;
}): string {
  const headerValue = request.headers?.["x-workspace-id"];
  if (headerValue) return headerValue;

  try {
    const url = new URL(request.path, "http://internal");
    const queryValue = url.searchParams.get("workspaceId");
    if (queryValue) return queryValue;
  } catch {
    // request.path wasn't a parseable URL — fall through to "unknown"
  }

  return "unknown";
};

export const onRequestError = (
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: Parameters<typeof Sentry.captureRequestError>[2]
) => {
  const workspaceId = resolveWorkspaceId(request);
  Sentry.withScope((scope) => {
    scope.setTag("route", request.path);
    scope.setTag("errorType", "unhandled_request_error");
    scope.setTag("workspaceId", workspaceId);
    Sentry.captureRequestError(err, request, context);
  });
};
