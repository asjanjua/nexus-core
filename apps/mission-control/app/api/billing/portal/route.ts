/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session so the customer can manage
 * their subscription, update payment methods, or cancel.
 *
 * Returns { url } — the hosted Stripe portal page to redirect the user to.
 * Scope: read:workspace (session or bearer)
 */
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { createBillingPortalSession, stripeConfigured } from "@/lib/billing/stripe";
import { repository } from "@/lib/data/repository";

export async function POST(request: Request) {
  // allowWhenBlocked: a suspended/expired workspace must still be able to
  // open the billing portal — otherwise there is no way to resolve the block.
  const { ctx, error } = await requireScope(request, "read:workspace", { allowWhenBlocked: true });
  if (error) return error;

  if (!stripeConfigured()) {
    return fail("stripe_not_configured", 503);
  }

  const billingState = await repository.getWorkspaceBillingState(ctx.workspaceId).catch(() => null);

  // Need a Stripe customer to open the portal
  const stripeCustomerId = await repository.getStripeCustomerId(ctx.workspaceId).catch(() => null);
  if (!stripeCustomerId) {
    return fail("no_stripe_customer", 400);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const session = await createBillingPortalSession(stripeCustomerId, `${appUrl}/settings`);

  void repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "billing_portal_opened",
    actor: ctx.userId,
    payload: { plan: billingState?.plan ?? "unknown" },
  }).catch(() => {});

  return ok({ url: session.url });
}
