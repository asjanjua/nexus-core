# Switching Stripe on

Self-serve checkout is paused until real Stripe credentials exist. Nothing is
broken and nothing needs rewriting — the code already branches on whether a key
is present. This is the checklist for the day the keys arrive.

## What happens today, with no keys

| Surface | Behaviour |
|---|---|
| `/pricing` Starter and Growth buttons | Go to `/start-pilot?plan=<tier>` and read "Talk to us" |
| `/pricing` | Shows a note that card payment is not switched on and the prices are final |
| `POST /api/billing/checkout` | `503 stripe_not_configured` |
| Settings upgrade buttons | Amber panel: "Card payment is not live yet", with a link to arrange it |
| Enterprise everywhere | Unchanged — always the lead form, never a checkout |

Nothing is charged, and no buyer reaches a dead end. The single switch is
`STRIPE_SECRET_KEY`: `selfServeCheckoutAvailable()` in `lib/pricing-tiers.ts`
reads it, and every surface above follows.

## Prices that must exist in Stripe

Create these as **recurring monthly, USD**, in the same mode (test or live) as
the secret key:

| Env var | Plan | Amount |
|---|---|---|
| `STRIPE_PRICE_PRO` | Starter | $49.00 |
| `STRIPE_PRICE_BUSINESS` | Growth | $499.00 |

Enterprise has no Stripe price. It is quoted, and the code refuses to open a
checkout for it.

## Steps

1. **Create the two prices** in Stripe with the amounts above.

2. **Set the environment variables** on Render:

   ```
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   STRIPE_PRICE_PRO
   STRIPE_PRICE_BUSINESS
   NEXT_PUBLIC_APP_URL
   ```

   `NEXT_PUBLIC_APP_URL` must have no trailing slash and must be the origin
   Stripe returns buyers to.

3. **Point the webhook** at `POST /api/billing/webhook` and subscribe to
   `checkout.session.completed`, `customer.subscription.deleted`,
   `invoice.payment_failed`, and `invoice.paid`. Copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.

   Without the webhook a customer is charged and the plan never activates.

4. **Verify published price against charged price**, which CI cannot do:

   ```bash
   npm run pricing:align
   ```

   Reports UNCHECKED and exits non-zero when credentials are missing, so a run
   with no keys never reads as a pass. Add `-- --sql` for the statements that
   bring `plan_definitions` in line.

5. **Check the database rows**, if any exist. A `plan_definitions` row
   overrides the in-code catalogue:

   ```sql
   SELECT plan_key, label, price_cents, max_team FROM plan_definitions;
   ```

   Expected: `pro` / Starter / 4900 / 10, `business` / Growth / 49900 / 50,
   `enterprise` / Enterprise / 0 / -1. Zero rows is also correct — the code
   falls back to `lib/billing/plan-catalog.ts`, which CI checks.

6. **Buy something.** In test mode, run one Starter checkout end to end with
   card `4242 4242 4242 4242` and confirm:
   - Stripe charges $49.00, not $499.00
   - the workspace plan changes to `pro`
   - the seat limit becomes 10, not 1
   - `checkout_initiated` and the activation appear in the audit trail

7. **Reverse it.** Cancel the test subscription and confirm the workspace
   returns to `free`. An upgrade path that cannot be undone is worse than none.

## After it is live

Remove the "not switched on" copy only if you want to — it disappears on its
own once `STRIPE_SECRET_KEY` is set, on both `/pricing` and Settings. No code
change is needed to switch over, and none is needed to switch back.

## Still open, unrelated to keys

Two plan limits are sold and not enforced: seats (`maxTeam`) and evidence
(`maxEvidence`). `checkEvidenceLimit` exists and is correct but nothing calls
it; seat counts are now real but nothing blocks going over. Both are the same
product decision — hard-block, allow overage and prompt, or leave on trust —
and it is worth deciding once for both rather than piecemeal.
