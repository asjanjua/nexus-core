import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * createCheckoutSession is the function that charges people, and it had no
 * test.
 *
 * The failure that costs real money is not an exception — it is a silent
 * omission. The webhook activates a plan by reading `metadata.workspaceId` and
 * `metadata.plan` off the completed session. Drop either and Stripe takes the
 * payment, the webhook logs "missing workspaceId metadata", and the customer
 * is charged with nothing upgraded. Nothing throws, nothing 500s, and the only
 * signal is a console line on a server nobody is watching.
 *
 * The metadata is set twice on purpose: once on the session and once under
 * subscription_data, because later subscription events do not carry the
 * session's metadata. Both are asserted.
 */

const getPlanDefinition = vi.fn(async () => null as { stripePriceId?: string | null } | null);
vi.mock("@/lib/data/repository", () => ({ repository: { getPlanDefinition } }));

const { createCheckoutSession } = await import("@/lib/billing/stripe");

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

/** The form-encoded body Stripe was actually posted, parsed back out. */
function postedParams(): URLSearchParams {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return new URLSearchParams(String(init.body));
}

beforeEach(() => {
  getPlanDefinition.mockReset().mockResolvedValue(null);
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_PRO = "price_starter";
  process.env.STRIPE_PRICE_BUSINESS = "price_growth";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.pinavia.io";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const OPTS = {
  plan: "pro" as const,
  workspaceId: "ws-42",
  customerEmail: "buyer@example.com",
};

describe("createCheckoutSession", () => {
  it("returns the hosted checkout URL", async () => {
    const session = await createCheckoutSession(OPTS);
    expect(session.url).toContain("checkout.stripe.com");
  });

  it("carries workspaceId and plan on the session metadata", async () => {
    // Without these the webhook cannot tell whose plan to activate.
    await createCheckoutSession(OPTS);
    const p = postedParams();
    expect(p.get("metadata[workspaceId]")).toBe("ws-42");
    expect(p.get("metadata[plan]")).toBe("pro");
  });

  it("repeats the metadata under subscription_data", async () => {
    // Later subscription events do not carry the session's metadata, so a
    // renewal or cancellation would arrive unattributable.
    await createCheckoutSession(OPTS);
    const p = postedParams();
    expect(p.get("subscription_data[metadata][workspaceId]")).toBe("ws-42");
    expect(p.get("subscription_data[metadata][plan]")).toBe("pro");
  });

  it("refuses rather than opening a checkout with no price", async () => {
    // Enterprise is quote-only. A session with no line item would either fail
    // at Stripe or, worse, succeed at zero.
    await expect(createCheckoutSession({ ...OPTS, plan: "enterprise" })).rejects.toThrow(
      /stripe_no_price/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses when the plan's price env var is unset", async () => {
    delete process.env.STRIPE_PRICE_PRO;
    await expect(createCheckoutSession(OPTS)).rejects.toThrow(/stripe_no_price/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the plan definition's price over the env var", async () => {
    // The DB row is authoritative; the env var is the legacy fallback. Getting
    // this backwards bills the old price after a migration.
    getPlanDefinition.mockResolvedValue({ stripePriceId: "price_from_db" });
    await createCheckoutSession(OPTS);
    expect(postedParams().get("line_items[0][price]")).toBe("price_from_db");
  });

  it("sends a monthly subscription for exactly one seat", async () => {
    await createCheckoutSession(OPTS);
    const p = postedParams();
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][quantity]")).toBe("1");
  });

  it("reuses an existing Stripe customer instead of the email", async () => {
    // Passing the email again creates a duplicate customer, which splits the
    // billing history and breaks the portal.
    await createCheckoutSession({ ...OPTS, stripeCustomerId: "cus_123" });
    const p = postedParams();
    expect(p.get("customer")).toBe("cus_123");
    expect(p.get("customer_email")).toBeNull();
  });

  it("falls back to the email when there is no customer yet", async () => {
    await createCheckoutSession(OPTS);
    const p = postedParams();
    expect(p.get("customer_email")).toBe("buyer@example.com");
    expect(p.get("customer")).toBeNull();
  });

  it("returns the buyer to settings with a result the page can read", async () => {
    // settings/page.tsx branches on ?billing=success|cancelled. A mismatch here
    // means a successful payment shows no confirmation.
    await createCheckoutSession(OPTS);
    const p = postedParams();
    expect(p.get("success_url")).toBe("https://app.pinavia.io/settings?billing=success&plan=pro");
    expect(p.get("cancel_url")).toBe("https://app.pinavia.io/settings?billing=cancelled");
  });

  it("does not emit a double slash when APP_URL has a trailing slash", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.pinavia.io/";
    await createCheckoutSession(OPTS);
    expect(postedParams().get("success_url")).not.toContain("io//settings");
  });

  it("surfaces a Stripe error rather than returning a session with no URL", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "No such price" } }),
    });
    await expect(createCheckoutSession(OPTS)).rejects.toThrow(/No such price/);
  });
});
