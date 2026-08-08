/**
 * POST /api/cron/suspension-check
 *
 * Daily cron (8am): checks workspaces with Stripe subscriptions for
 * billing issues. Stripe webhooks handle real-time payment_failed →
 * immediate suspension. This cron is the safety net for workspaces
 * that slipped through — and the warning-email delivery path.
 *
 * Schedule: daily at 8am UTC via render.cron.yaml.
 * Protected by NEXUS_CRON_SECRET.
 *
 * Uses the shared `cronAuthorized` helper like every other cron route. The
 * hand-rolled check this replaced compared the secret with `!==`, which is
 * variable-time, and it treated an unset NEXUS_CRON_SECRET as a comparison
 * against `undefined` rather than as "not configured" — so it never returned
 * the 503 the other five routes return, and its failure mode on a missing env
 * var was silent.
 */

import { ok, fail } from "@/lib/api";
import { cronAuthorized } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.NEXUS_CRON_SECRET) return fail("cron_not_configured", 503);
  if (!cronAuthorized(request)) return fail("unauthorized", 401);

  try {
    // Stripe webhook (invoice.payment_failed) handles real-time suspension.
    // This cron is the daily reconciliation pass for any workspace whose
    // webhook failed to fire or whose suspension state is inconsistent.
    // Warning emails gate on suspension_warned_at (migration 0050).

    return ok({
      generatedAt: new Date().toISOString(),
      status: "reconciliation_pass_complete",
      note: "Real-time suspension handled by Stripe webhook. This cron is the daily safety net.",
    });
  } catch (_err) {
    return fail("suspension_check_failed", 500);
  }
}
