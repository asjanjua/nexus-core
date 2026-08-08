/**
 * Structured reporting for error paths that are deliberately swallowed at the
 * call site (webhook handlers that must always return 200, fire-and-forget
 * background jobs, fully-exhausted LLM fallback chains, fail-open guards).
 *
 * WHAT THIS IS NOT
 * ----------------
 * This module was called `observability/sentry.ts` and its functions were
 * called `capture*`, but nothing here reports to Sentry. The Sentry runtime
 * entrypoints are disabled in the demo build path because Next 15 middleware
 * builds hang while bundling Sentry/OpenTelemetry. Renamed so nobody pages
 * themselves at 3am wondering why Sentry is empty. `observability/sentry.ts`
 * remains as a thin re-export for the call sites that still import it.
 *
 * What it does instead: writes one structured line per event to stderr, which
 * Render captures. A swallowed failure leaves a trace somewhere instead of
 * vanishing. No Sentry import is involved, so the build path is unaffected.
 *
 * PII
 * ---
 * Payloads are excluded on purpose: callers pass audit events and webhook
 * bodies that carry customer data, and this output goes to a plaintext log.
 * Error messages are scrubbed for the patterns most likely to carry personal
 * data (Postgres echoes parameter values into constraint-violation messages,
 * e.g. `Key (email)=(ceo@client.com) already exists`) before being written.
 * That matters under PDPL and GDPR for the client base this runs for.
 *
 * Task #32 — production error tracking.
 */

type ReportContext = {
  route: string;
  errorType: string;
  workspaceId?: string;
  extra?: Record<string, unknown>;
};

/**
 * Keys from `context.extra` that may be written to the log.
 *
 * THE HISTORY MATTERS HERE, because both obvious designs are wrong.
 *
 * Originally `extra` was accepted by the type and then silently discarded. That
 * was a deliberate PII decision — callers pass audit events and webhook bodies,
 * and this output is plaintext — and tests/audit-write-failure.test.ts pins it
 * with a caller passing `{ email, secret }`.
 *
 * But twelve call sites were passing operational metadata through `extra`
 * (connectorType, feature, attempt) and getting nothing. Anyone reading those
 * call sites during an incident would reasonably believe the fields were being
 * captured. So dropping everything is wrong too: it turns a debugging aid into
 * a lie.
 *
 * An allowlist is the only version that is both honest and safe. A key on this
 * list is one that, by construction, cannot carry customer data: it is an
 * enum, an identifier we minted, or a counter. Anything a caller invents is
 * dropped, so a future call site cannot leak by accident — the default is
 * still "not logged".
 *
 * ADDING A KEY IS A PRIVACY DECISION. Only add values that can never contain
 * customer content, an email address, a name, a token, or free text.
 */
const LOGGABLE_EXTRA_KEYS = new Set([
  "connectorType",
  "feature",
  "attempt",
  "callerUserId",
  "provider",
  "status",
  "statusCode",
  "count",
  "durationMs",
  "jobType",
  "reason",
]);

/** Longest a single field may be before it is truncated. */
const MAX_FIELD_CHARS = 500;

/**
 * How long the same event must stay quiet after being reported once.
 *
 * Without this, a sustained upstream failure emits one line per call: a bulk
 * ingest against a degraded OpenAI produced one event per chunk, and a broken
 * connector produced one per cron poll. Volume that large is both unreadable
 * and, once a real transport is wired up, billable.
 */
const REPORT_COOLDOWN_MS = 60_000;

/**
 * Bound on the dedupe map. Keys include workspaceId, so an unbounded map grows
 * with tenant count. At the cap the oldest entries are dropped, which at worst
 * lets a suppressed event through early — the safe direction to fail.
 */
const MAX_COOLDOWN_KEYS = 5_000;

const lastReportedAt = new Map<string, number>();

function shouldReport(key: string): boolean {
  const now = Date.now();
  const previous = lastReportedAt.get(key);
  if (previous !== undefined && previous > now - REPORT_COOLDOWN_MS) return false;

  if (lastReportedAt.size >= MAX_COOLDOWN_KEYS) {
    // Map iterates in insertion order, so this drops the oldest entries.
    let toDrop = Math.ceil(MAX_COOLDOWN_KEYS / 10);
    for (const staleKey of lastReportedAt.keys()) {
      lastReportedAt.delete(staleKey);
      if (--toDrop <= 0) break;
    }
  }

  lastReportedAt.set(key, now);
  return true;
}

/** Exposed for tests. Cooldown state is process-global and would otherwise leak between cases. */
export function __resetReportCooldownForTests(): void {
  lastReportedAt.clear();
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown_error";
}

/**
 * Collapse to a single line and strip the values most likely to be personal
 * data. A multi-line error message would otherwise split one event across
 * several log lines and break any downstream parser.
 */
function sanitise(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    // Postgres constraint violations: Key (email)=(someone@example.com)
    .replace(/\(([^()=]+)\)=\([^)]*\)/g, "($1)=(redacted)")
    // Bare email addresses anywhere else in the message.
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "redacted@redacted")
    .slice(0, MAX_FIELD_CHARS);
}

function report(level: "error" | "warn", detail: string, context: ReportContext): void {
  // Key on the shape of the event, not its detail: a message that varies per
  // call (a changing HTTP status, a row id) must not defeat the cooldown.
  const key = `${context.errorType}:${context.route}:${context.workspaceId ?? "-"}`;
  if (!shouldReport(key)) return;

  // Allowlisted keys only — see LOGGABLE_EXTRA_KEYS for why this is neither
  // "log everything" nor "log nothing". Dropped keys are counted rather than
  // named, so a call site passing something unloggable is visible without the
  // key name itself becoming the leak.
  const entries = Object.entries(context.extra ?? {});
  const allowed = entries
    .filter(([k]) => LOGGABLE_EXTRA_KEYS.has(k))
    .map(([k, v]) => `${k}=${sanitise(String(v))}`);
  const droppedCount = entries.length - allowed.length;

  const parts = [
    `[observability] ${context.errorType}`,
    `route=${context.route}`,
    context.workspaceId ? `workspace=${context.workspaceId}` : null,
    ...allowed,
    droppedCount > 0 ? `extraOmitted=${droppedCount}` : null,
    `detail=${sanitise(detail)}`,
  ].filter(Boolean);

  console[level](parts.join(" "));
}

export function reportHandledError(err: unknown, context: ReportContext): void {
  report("error", messageOf(err), context);
}

/**
 * For exhausted/degraded states that aren't a thrown JS error but are still
 * worth knowing about in production (e.g. every provider in an LLM fallback
 * chain failed). Reported as a message, not an exception.
 */
export function reportDegradedState(message: string, context: ReportContext): void {
  report("warn", message, context);
}

export type { ReportContext };
