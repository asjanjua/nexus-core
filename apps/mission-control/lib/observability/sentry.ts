/**
 * Compatibility shim. The implementation moved to ./report.ts.
 *
 * The old name was actively misleading: this module never reported to Sentry
 * (the Sentry runtime entrypoints are disabled because Next 15 middleware
 * builds hang while bundling Sentry/OpenTelemetry), yet it was called
 * `sentry.ts` and exported `capture*` functions. Someone would eventually go
 * looking in Sentry for events that were only ever in the Render log stream.
 *
 * Kept as a re-export rather than renamed at ~60 call sites in one pass, so
 * the rename cannot itself become the change that breaks something. New code
 * should import from "@/lib/observability/report". Migrate call sites
 * opportunistically and delete this file when the last one is gone.
 *
 * See docs/PR_REVIEW_2026-08-08.md §7.1.
 */

import { reportDegradedState, reportHandledError } from "@/lib/observability/report";

export { reportDegradedState, reportHandledError };
export type { ReportContext } from "@/lib/observability/report";

/** @deprecated Use `reportHandledError` from "@/lib/observability/report". */
export const captureHandledError = reportHandledError;

/** @deprecated Use `reportDegradedState` from "@/lib/observability/report". */
export const captureDegradedState = reportDegradedState;
