/**
 * Workspace expiry cron — suspends time-boxed workspaces (Vantage per-deal,
 * Meridian per-submission) whose expiresAt deadline has passed.
 *
 * Does NOT delete any data. Suspension uses the same suspendedAt mechanism
 * as payment-failure suspension, so it is fully reversible — see
 * repository.convertExpiredWorkspaces(). Actual data deletion is a separate,
 * deliberate action: POST /api/workspaces/[id]/purge.
 *
 * Called by the same Render cron job as billing/synthesis. Protected by
 * NEXUS_CRON_SECRET.
 */
import { fail, ok } from "@/lib/api";
import { cronAuthorized } from "@/lib/security";
import { repository } from "@/lib/data/repository";


export async function POST(request: Request) {
  if (!process.env.NEXUS_CRON_SECRET) return fail("cron_not_configured", 503);
  if (!cronAuthorized(request)) return fail("unauthorized", 401);

  const ranAt = new Date().toISOString();
  const workspacesExpired = await repository.convertExpiredWorkspaces();

  return ok({ workspacesExpired, ranAt });
}
