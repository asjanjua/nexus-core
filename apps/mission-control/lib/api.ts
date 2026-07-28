import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: Record<string, unknown>): NextResponse {
  // A 429 carrying retryAfter only in the JSON body is invisible to every
  // standard client, proxy, and SDK retry policy, all of which read the
  // Retry-After header. /api/oauth/token set it by hand; the readiness and
  // reviewer-seat routes did not. Mirroring it here covers them without each
  // call site remembering.
  const headers: Record<string, string> = {};
  if (status === 429 && typeof details?.retryAfter === "number") {
    headers["retry-after"] = String(Math.max(0, Math.ceil(details.retryAfter)));
  }

  return NextResponse.json(
    { ok: false, error: message, ...(details ?? {}) },
    Object.keys(headers).length > 0 ? { status, headers } : { status }
  );
}
