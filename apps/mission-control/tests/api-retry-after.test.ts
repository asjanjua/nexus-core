import { describe, expect, it } from "vitest";
import { fail, ok } from "@/lib/api";

/**
 * Rate-limited routes returned retryAfter in the JSON body only. Standard
 * clients, proxies, and SDK retry policies read the Retry-After header, so the
 * backoff hint was invisible to everything that would have acted on it.
 */
describe("fail() Retry-After", () => {
  it("mirrors retryAfter into the header on a 429", async () => {
    const res = fail("rate_limited", 429, { retryAfter: 42 });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    await expect(res.json()).resolves.toMatchObject({ ok: false, retryAfter: 42 });
  });

  it("rounds a fractional window up rather than truncating to zero", () => {
    expect(fail("rate_limited", 429, { retryAfter: 0.2 }).headers.get("retry-after")).toBe("1");
  });

  it("does not set the header on other statuses", () => {
    expect(fail("nope", 400, { retryAfter: 10 }).headers.get("retry-after")).toBeNull();
  });

  it("leaves a 429 without a retryAfter alone", () => {
    expect(fail("eval_rate_limited", 429).headers.get("retry-after")).toBeNull();
  });

  it("does not disturb ok()", async () => {
    const res = ok({ value: 1 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, data: { value: 1 } });
  });
});
