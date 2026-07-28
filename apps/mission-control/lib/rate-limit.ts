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

  if (buckets.size > MAX_TRACKED_KEYS) {
    sweepExpired(now);
    // The sweep only reclaims CLOSED windows. If a burst creates more live keys
    // than the cap inside one window there is nothing to reclaim, so the sweep
    // frees nothing and every subsequent request pays a full O(n) scan. Evict
    // oldest-first to restore the bound. Map preserves insertion order, so the
    // head is the least recently created bucket.
    if (buckets.size > MAX_TRACKED_KEYS) {
      const excess = buckets.size - MAX_TRACKED_KEYS;
      let removed = 0;
      for (const key of buckets.keys()) {
        buckets.delete(key);
        if (++removed >= excess) break;
      }
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  // Stop counting once over the limit. A flood previously drove `count` far
  // past `limit` for the rest of the window, which is harmless for the `>`
  // check but makes the counter useless for metrics and would misbehave if
  // anything later keyed backoff on it.
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Number of proxies in front of this app that APPEND to x-forwarded-for.
 *
 * Must match the deployment. Behind Cloudflare in front of Render this is 2
 * (Cloudflare appends the client, Render appends Cloudflare); a single proxy is
 * 1. Confirm against a real request before changing it — log the raw header
 * from a production request and count the entries a client did not send.
 */
const TRUSTED_PROXY_HOPS = Math.max(
  1,
  Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10) || 1
);

/**
 * Best-effort client identifier.
 *
 * x-forwarded-for is APPEND-ONLY: each proxy adds the address it received the
 * connection from, so entries to the LEFT of our trusted hops were written by
 * the caller. Keying on the left-most entry therefore lets one client mint an
 * unlimited number of buckets by rotating the header, which removes the limit
 * entirely rather than weakening it.
 *
 * We index from the right by the trusted hop count instead. If the chain is
 * shorter than expected — a misconfigured hop count, a direct-to-origin request
 * that bypassed the proxy — we fall back to a single shared bucket rather than
 * to a caller-controlled value.
 *
 * That failure direction is deliberate: too few buckets throttles unrelated
 * callers together, which is an availability annoyance; too many removes the
 * protection altogether. Prefer over-bucketing.
 */
export function clientKey(request: Request, scope: string): string {
  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  // chain[length - hops] is the address the outermost trusted proxy observed.
  // Anything further left is caller-supplied and must never be used.
  const trusted = chain.length >= TRUSTED_PROXY_HOPS
    ? chain[chain.length - TRUSTED_PROXY_HOPS]
    : undefined;

  const ip = trusted || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

/** Reset all buckets. Test-only. */
export function resetRateLimits(): void {
  buckets.clear();
}
