/**
 * Stripe integration — pure fetch, no SDK dependency.
 *
 * Implements the subset of the Stripe API needed for NexusAI billing:
 *   - Checkout Session creation (subscription mode)
 *   - Billing Portal session creation
 *   - Webhook signature verification
 *   - Customer lookup / creation
 *
 * All functions throw on error so callers can wrap in try/catch and
 * return structured error responses.
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_...
 *   STRIPE_PRICE_PRO        — price_... for Pro plan
 *   STRIPE_PRICE_BUSINESS   — price_... for Business plan
 *   NEXT_PUBLIC_APP_URL     — https://app.nexusai.io (no trailing slash)
 */

import type { BillingPlan } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STRIPE_BASE = "https://api.stripe.com/v1";

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Stripe Price ID for a given plan. Enterprise has no self-serve Stripe price.
 * Reads from plan_definitions.stripePriceId first; falls back to the legacy
 * env vars (STRIPE_PRICE_PRO / STRIPE_PRICE_BUSINESS) if the DB column is
 * unset, so existing deployments keep working until the column is populated.
 */
export async function priceIdForPlan(plan: BillingPlan): Promise<string | null> {
  if (plan !== "pro" && plan !== "business") return null; // free and enterprise have no Stripe price

  const def = await repository.getPlanDefinition(plan).catch(() => null);
  if (def?.stripePriceId) return def.stripePriceId;

  if (plan === "pro") return process.env.STRIPE_PRICE_PRO?.trim() ?? null;
  return process.env.STRIPE_PRICE_BUSINESS?.trim() ?? null;
}

/** Monthly token limit per plan (mirrors plan_definitions seed). */
export const PLAN_TOKEN_LIMITS: Record<BillingPlan, number> = {
  free:       500_000,
  pro:        5_000_000,
  business:   25_000_000,
  enterprise: 0, // 0 = unlimited
};

// ---------------------------------------------------------------------------
// Low-level Stripe HTTP helper
// ---------------------------------------------------------------------------

/** Encode an object as application/x-www-form-urlencoded, supporting one level of nesting. */
function encodeForm(data: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join("&");
}

async function stripePost<T>(path: string, params: Record<string, string | number | boolean | null | undefined>): Promise<T> {
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(params),
  });

  const json = await res.json() as T & { error?: { message: string; type: string } };
  if (!res.ok) {
    const msg = (json as { error?: { message: string } }).error?.message ?? `Stripe error ${res.status}`;
    throw new Error(`stripe_error: ${msg}`);
  }
  return json;
}

async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  const json = await res.json() as T & { error?: { message: string } };
  if (!res.ok) {
    const msg = (json as { error?: { message: string } }).error?.message ?? `Stripe error ${res.status}`;
    throw new Error(`stripe_error: ${msg}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

interface StripeCustomer {
  id: string;
  email: string | null;
}

interface StripeCustomerList {
  data: StripeCustomer[];
}

/** Find an existing Stripe customer by email, or create one. */
export async function findOrCreateCustomer(email: string, workspaceId: string): Promise<StripeCustomer> {
  const list = await stripeGet<StripeCustomerList>(
    `/customers?email=${encodeURIComponent(email)}&limit=1`
  );
  if (list.data.length > 0) return list.data[0];

  return stripePost<StripeCustomer>("/customers", {
    email,
    "metadata[workspaceId]": workspaceId,
  });
}

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

export interface CheckoutSessionOptions {
  plan: BillingPlan;
  workspaceId: string;
  customerEmail: string;
  stripeCustomerId?: string | null;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

/**
 * Creates a Stripe Checkout Session for a subscription upgrade.
 * Returns the hosted URL to redirect the user to.
 */
export async function createCheckoutSession(opts: CheckoutSessionOptions): Promise<StripeCheckoutSession> {
  const priceId = await priceIdForPlan(opts.plan);
  if (!priceId) {
    throw new Error(`stripe_no_price: No Stripe price configured for plan "${opts.plan}"`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const successUrl = `${appUrl}/settings?billing=success&plan=${opts.plan}`;
  const cancelUrl  = `${appUrl}/settings?billing=cancelled`;

  const params: Record<string, string | number | boolean | null | undefined> = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[workspaceId]": opts.workspaceId,
    "metadata[plan]": opts.plan,
    "subscription_data[metadata][workspaceId]": opts.workspaceId,
    "subscription_data[metadata][plan]": opts.plan,
  };

  if (opts.stripeCustomerId) {
    params["customer"] = opts.stripeCustomerId;
  } else {
    params["customer_email"] = opts.customerEmail;
  }

  return stripePost<StripeCheckoutSession>("/checkout/sessions", params);
}

// ---------------------------------------------------------------------------
// Billing Portal
// ---------------------------------------------------------------------------

export interface BillingPortalSession {
  id: string;
  url: string;
}

/**
 * Creates a Stripe Billing Portal session so the customer can manage
 * their subscription, update payment methods, and cancel.
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<BillingPortalSession> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return stripePost<BillingPortalSession>("/billing_portal/sessions", {
    customer: stripeCustomerId,
    return_url: returnUrl ?? `${appUrl}/settings`,
  });
}

// ---------------------------------------------------------------------------
// Webhook verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

/**
 * Verifies a Stripe webhook signature using the Web Crypto API.
 * Stripe signs payloads with HMAC-SHA256 using the webhook secret.
 *
 * Header format: t=<timestamp>,v1=<signature>
 * Signed payload: "<timestamp>.<rawBody>"
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  // Parse the Stripe-Signature header
  const parts = Object.fromEntries(
    signature.split(",").map((part) => part.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  // Replay protection: reject if older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", keyMaterial, encoder.encode(signedPayload));
  const expected = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === v1;
}

// ---------------------------------------------------------------------------
// Stripe event types (subset we handle)
// ---------------------------------------------------------------------------

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  items: {
    data: Array<{
      price: { id: string };
    }>;
  };
  metadata: Record<string, string>;
}

export interface StripeCheckoutSessionCompleted {
  id: string;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  metadata: Record<string, string>;
  mode: string;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  status: string;
}

export type StripeEventType =
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_failed"
  | "invoice.paid";

export interface StripeEvent {
  id: string;
  type: StripeEventType | string;
  data: {
    object: StripeCheckoutSessionCompleted | StripeSubscription | StripeInvoice;
  };
}

/**
 * Retrieves a Stripe subscription by ID to get full metadata.
 * Used in webhook processing when subscription ID is available.
 */
export async function getSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return stripeGet<StripeSubscription>(`/subscriptions/${subscriptionId}`);
}

/**
 * Resolve which NexusAI plan a Stripe subscription belongs to, by matching
 * the price ID against plan_definitions.stripePriceId first, then falling
 * back to the legacy env vars if no DB row matches.
 */
export async function planFromPriceId(priceId: string): Promise<BillingPlan | null> {
  const def = await repository.getPlanDefinitionByStripePriceId(priceId).catch(() => null);
  if (def) return def.planKey as BillingPlan;

  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS?.trim()) return "business";
  return null;
}
