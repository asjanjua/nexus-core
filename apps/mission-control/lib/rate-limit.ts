/**
 * Fixed-window rate limiting for unauthenticated and credential-bearing routes.
 *
 * In-process only, matching the caching approach already used for workspace
 * access in lib/api-auth.ts and token budgets in lib/billing/budget.ts. On a
 * single Render web service that is the whole request surface; if the service
 * is ever scaled past one instance the limits become per-instance, which is a
 * weaker guarantee but still bounds a single attacker's throughput.
 *
 * Applied to the routes where guessing or flooding is the attack: OAuth token
 * issuance (client_secret brute force), invite and claim code redemption, and
 * public form posts.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Cap on tracked keys. Sweeping every call would be O(n) on a hot path, so
 * expired entries are only reclaimed once the map grows past this.
 */
const MAX_TRACKED_KEYS = 10_000;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets. Zero when allowed. */
  retryAfter: number;
};

/**
 * Consume one unit against `key`. Returns whether the caller may proceed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort client identifier. Render terminates TLS upstream, so the left
 * -most x-forwarded-for entry is the client. Falls back to a single shared
 * bucket when no proxy header is present, which is strictly safer than keying
 * on something the caller controls outright.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

/** Reset all buckets. Test-only. */
export function resetRateLimits(): void {
  buckets.clear();
}
