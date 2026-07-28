/**
 * Fixed-window rate limiter used to bound credential guessing on
 * /api/oauth/token, /api/reviewer-seat/accept, /api/readiness/claim, and
 * flooding of the public /api/readiness/submit form.
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { clientKey, rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the one after", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit("k", 3, 60_000).allowed).toBe(true);
    }
    expect(rateLimit("k", 3, 60_000).allowed).toBe(false);
  });

  it("reports seconds until the window resets when blocked", () => {
    rateLimit("k", 1, 60_000);
    const blocked = rateLimit("k", 1, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
    // A different key is unaffected by the exhausted one.
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("allows again once the window has elapsed", () => {
    vi.useFakeTimers();
    expect(rateLimit("k", 1, 1_000).allowed).toBe(true);
    expect(rateLimit("k", 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit("k", 1, 1_000).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  // The left-most entry is caller-supplied. Keying on it let one client mint an
  // unlimited number of buckets by rotating the header, which removed the limit
  // rather than weakening it. We index from the right by the trusted hop count.
  it("ignores caller-supplied entries and keys on the trusted hop", () => {
    const request = new Request("https://x/api/test", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1, 10.0.0.2" },
    });
    expect(clientKey(request, "scope")).toBe("scope:10.0.0.2");
  });

  it("gives a spoofing client one shared bucket, not one per forged value", () => {
    const keys = new Set(
      Array.from({ length: 200 }, (_, i) =>
        clientKey(
          new Request("https://x/api/test", {
            headers: { "x-forwarded-for": `10.9.9.${i % 256}, 203.0.113.9` },
          }),
          "scope"
        )
      )
    );
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("scope:203.0.113.9");
  });

  it("falls back to a shared bucket when the chain is shorter than expected", () => {
    // A direct-to-origin request that never traversed the proxy must not be
    // able to supply its own key.
    const request = new Request("https://x/api/test", {
      headers: { "x-forwarded-for": "" },
    });
    expect(clientKey(request, "scope")).toBe("scope:unknown");
  });

  it("falls back to x-real-ip when no forwarded header is present", () => {
    const request = new Request("https://x/api/test", {
      headers: { "x-real-ip": "203.0.113.10" },
    });
    expect(clientKey(request, "scope")).toBe("scope:203.0.113.10");
  });

  it("falls back to a shared bucket rather than a caller-controlled value", () => {
    const request = new Request("https://x/api/test");
    expect(clientKey(request, "scope")).toBe("scope:unknown");
  });

  it("namespaces by scope so one route cannot exhaust another", () => {
    const request = new Request("https://x/api/test", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    expect(clientKey(request, "token")).not.toBe(clientKey(request, "submit"));
  });
});
