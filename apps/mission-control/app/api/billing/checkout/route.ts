/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for a plan upgrade.
 * Returns { url } — the hosted Stripe checkout page to redirect the user to.
 *
 * Body: { plan: "pro" | "business" }
 * Scope: read:workspace (session or bearer)
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { createCheckoutSession, stripeConfigured, priceIdForPlan } from "@/lib/billing/stripe";
import { repository } from "@/lib/data/repository";
import { billingPlanSchema } from "@/lib/contracts";

const bodySchema = z.object({
  plan: billingPlanSchema,
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  if (!stripeConfigured()) {
    return fail("stripe_not_configured", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_plan", 400);

  const { plan } = parsed.data;

  if (plan === "free" || plan === "enterprise") {
    return fail("unsupported_plan", 400);
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return fail("stripe_price_not_configured", 503);
  }

  // Get current workspace Stripe state
  const billingState = await repository.getWorkspaceBillingState(ctx.workspaceId).catch(() => null);

  // Build checkout session
  const session = await createCheckoutSession({
    plan,
    workspaceId: ctx.workspaceId,
    customerEmail: ctx.userId, // Clerk userId used as email fallback; real email comes from Clerk profile
    stripeCustomerId: billingState ? null : null, // Will be populated from Clerk email in webhook
  });

  if (!session.url) {
    return fail("stripe_no_url", 500);
  }

  // Audit intent
  void repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "checkout_initiated",
    actor: ctx.userId,
    payload: { plan, sessionId: session.id },
  }).catch(() => {});

  return ok({ url: session.url, sessionId: session.id });
}
