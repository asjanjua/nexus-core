/**
 * Connector Sync Engine — scheduler, retry logic, and history tracking.
 *
 * Powers Connector Ops shared infrastructure. Every connector sync
 * writes a run record; failed syncs receive exponential backoff
 * retry scheduling. Freshness is tracked per-connector via
 * the connectors.lastSyncAt and connector_sync_runs history.
 */

// ---------------------------------------------------------------------------
// Retry policy — exponential backoff
// ---------------------------------------------------------------------------

export const RETRY_POLICY = {
  /** Base delay between retries in milliseconds. */
  baseDelayMs: 30_000, // 30s
  /** Maximum delay between retries. */
  maxDelayMs: 3_600_000, // 1 hour
  /** Maximum number of retry attempts before giving up. */
  maxRetries: 5,
  /** Multiplier for each successive backoff (2 = exponential). */
  backoffMultiplier: 2,
} as const;

/**
 * Calculate the next retry timestamp for a failed sync run.
 * Exponential backoff: 30s, 1m, 2m, 4m, 8m, 16m... cap at 1hr.
 */
export function nextRetryAt(retryCount: number): Date {
  const delay = Math.min(
    RETRY_POLICY.baseDelayMs * Math.pow(RETRY_POLICY.backoffMultiplier, retryCount),
    RETRY_POLICY.maxDelayMs,
  );
  return new Date(Date.now() + delay);
}

/**
 * Returns true if a sync run is eligible for retry.
 * A run is retriable if: status=failed, retryCount < maxRetries,
 * and nextRetryAt has passed.
 */
export function isRetriable(run: {
  status: string;
  retryCount: number;
  nextRetryAt: string | null;
}): boolean {
  if (run.status !== "failed") return false;
  if (run.retryCount >= RETRY_POLICY.maxRetries) return false;
  if (!run.nextRetryAt) return false;
  return new Date(run.nextRetryAt).getTime() <= Date.now();
}

// ---------------------------------------------------------------------------
// Sync run record builder
// ---------------------------------------------------------------------------

export interface SyncRunInput {
  id: string;
  connectorId: string;
  workspaceId: string;
  triggerType: "manual" | "cron" | "webhook" | "retry";
  retryCount?: number;
}

export interface SyncRunResult {
  status: "success" | "failed" | "partial";
  recordsIngested: number;
  recordsFailed: number;
  recordsSkipped: number;
  errorMessage?: string;
  errorCode?: string;
}
