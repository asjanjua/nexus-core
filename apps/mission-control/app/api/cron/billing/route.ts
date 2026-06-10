/**
 * Billing cron — two jobs in one endpoint:
 *   1. Reset monthly token counters for workspaces past their reset date.
 *   2. Convert expired trials (status=trial, trial_ends_at < NOW()) to free plan.
 *
 * Called by the same Render cron job as synthesis (daily or more frequent).
 * Protected by NEXUS_CRON_SECRET.
 */
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";

function cronAuthorized(request: Request): boolean {
  const secret = process.env.NEXUS_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const header = request.headers.get("x-cron-secret") ?? "";
  return auth === `Bearer ${secret}` || header === secret;
}

export async function POST(request: Request) {
  if (!process.env.NEXUS_CRON_SECRET) return fail("cron_not_configured", 503);
  if (!cronAuthorized(request)) return fail("unauthorized", 401);

  const ranAt = new Date().toISOString();

  // Run both jobs in parallel
  const [resetCount, trialsConverted] = await Promise.all([
    repository.resetAllDueMonthlyTokens(),
    repository.convertExpiredTrials(),
  ]);

  void repository.pushAudit({
    workspaceId: "_system_",
    type: "billing_cron_ran",
    actor: "cron",
    payload: { workspacesReset: resetCount, trialsConverted, ranAt },
  }).catch(() => {});

  return ok({ workspacesReset: resetCount, trialsConverted, ranAt });
}
