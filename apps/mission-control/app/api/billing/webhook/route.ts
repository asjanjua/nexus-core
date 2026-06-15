/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint. Handles the subscription lifecycle:
 *
 *   checkout.session.completed     — activate plan after first payment
 *   customer.subscription.updated  — plan change (upgrade / downgrade)
 *   customer.subscription.deleted  — revert to free on cancellation
 *   invoice.payment_failed         — suspend workspace
 *   invoice.paid                   — unsuspend on successful retry
 *
 * Authentication: Stripe-Signature HMAC-SHA256 (STRIPE_WEBHOOK_SECRET).
 * No Clerk auth — Stripe calls this directly.
 *
 * Returns 200 immediately for all valid events (including unhandled types)
 * so Stripe does not retry. Returns 400 on signature failure only.
 */

import { fail, ok } from "@/lib/api";
import {
  verifyWebhookSignature,
  getSubscription,
  planFromPriceId,
  PLAN_TOKEN_LIMITS,
  type StripeEvent,
  type StripeCheckoutSessionCompleted,
  type StripeSubscription,
  type StripeInvoice,
} from "@/lib/billing/stripe";
import { repository } from "@/lib/data/repository";
import { invalidateBudgetCache } from "@/lib/billing/budget";

// Webhook must read the raw body before any parsing
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!signature) {
    return fail("missing_signature", 400);
  }

  const valid = await verifyWebhookSignature(rawBody, signature).catch(() => false);
  if (!valid) {
    return fail("invalid_signature", 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return fail("invalid_json", 400);
  }

  // Process event — fire-and-forget errors so Stripe gets a 200 regardless
  try {
    await processEvent(event);
  } catch (err) {
    console.error("[billing/webhook] Event processing error:", event.type, err);
    // Still return 200 — returning 4xx/5xx causes Stripe to retry indefinitely
  }

  return ok({ received: true, type: event.type });
}

// ---------------------------------------------------------------------------
// Event processors
// ---------------------------------------------------------------------------

async function processEvent(event: StripeEvent): Promise<void> {
  // Idempotency guard — Stripe redelivers events on non-2xx and occasionally on 2xx.
  // markStripeEventProcessed inserts with ON CONFLICT DO NOTHING.
  // If the event was already processed, skip it silently.
  const isNew = await repository.markStripeEventProcessed(event.id, event.type);
  if (!isNew) {
    console.info("[billing/webhook] Duplicate event skipped:", event.id, event.type);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as StripeCheckoutSessionCompleted);
      break;
    case "customer.subscription.updated":
      await onSubscriptionUpdated(event.data.object as StripeSubscription);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object as StripeSubscription);
      break;
    case "invoice.payment_failed":
      await onPaymentFailed(event.data.object as StripeInvoice);
      break;
    case "invoice.paid":
      await onInvoicePaid(event.data.object as StripeInvoice);
      break;
    default:
      // Unhandled event type — acknowledge and ignore
      break;
  }
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function onCheckoutCompleted(session: StripeCheckoutSessionCompleted): Promise<void> {
  if (session.mode !== "subscription") return;

  const workspaceId = session.metadata?.workspaceId;
  const planFromMeta = session.metadata?.plan;

  if (!workspaceId) {
    console.error("[webhook] checkout.session.completed missing workspaceId metadata", session.id);
    return;
  }

  const stripeCustomerId = session.customer ?? "";
  const stripeSubscriptionId = session.subscription ?? "";

  // Plan from metadata is most reliable at checkout time
  const plan = (planFromMeta === "pro" || planFromMeta === "business") ? planFromMeta : null;

  if (!plan) {
    console.error("[webhook] checkout.session.completed unrecognised plan", planFromMeta);
    return;
  }

  const monthlyTokenLimit = PLAN_TOKEN_LIMITS[plan];

  await repository.activatePlan(
    workspaceId,
    plan,
    monthlyTokenLimit,
    stripeCustomerId,
    stripeSubscriptionId
  );

  invalidateBudgetCache(workspaceId);
}

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------

async function onSubscriptionUpdated(subscription: StripeSubscription): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) {
    // Fall back: look up by Stripe customer ID
    const ws = await repository.getWorkspaceByStripeCustomer(subscription.customer);
    if (!ws) {
      console.error("[webhook] subscription.updated cannot resolve workspace", subscription.customer);
      return;
    }
    await handleSubscriptionUpdate(ws.id, subscription);
    return;
  }
  await handleSubscriptionUpdate(workspaceId, subscription);
}

async function handleSubscriptionUpdate(workspaceId: string, subscription: StripeSubscription): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const plan = planFromPriceId(priceId) ?? "free";
  const monthlyTokenLimit = PLAN_TOKEN_LIMITS[plan];

  await repository.handleSubscriptionChange(
    workspaceId,
    plan,
    monthlyTokenLimit,
    subscription.id,
    "updated"
  );

  invalidateBudgetCache(workspaceId);
}

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

async function onSubscriptionDeleted(subscription: StripeSubscription): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId
    ?? (await repository.getWorkspaceByStripeCustomer(subscription.customer))?.id;

  if (!workspaceId) {
    console.error("[webhook] subscription.deleted cannot resolve workspace", subscription.customer);
    return;
  }

  // Revert to free plan
  await repository.handleSubscriptionChange(
    workspaceId,
    "free",
    PLAN_TOKEN_LIMITS.free,
    subscription.id,
    "cancelled"
  );

  invalidateBudgetCache(workspaceId);
}

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

async function onPaymentFailed(invoice: StripeInvoice): Promise<void> {
  const ws = await repository.getWorkspaceByStripeCustomer(invoice.customer);
  if (!ws) return;

  await repository.suspendWorkspace(ws.id, "payment_failed");
  invalidateBudgetCache(ws.id);
}

// ---------------------------------------------------------------------------
// invoice.paid
// ---------------------------------------------------------------------------

async function onInvoicePaid(invoice: StripeInvoice): Promise<void> {
  const ws = await repository.getWorkspaceByStripeCustomer(invoice.customer);
  if (!ws) return;

  await repository.unsuspendWorkspace(ws.id);
  invalidateBudgetCache(ws.id);
}
