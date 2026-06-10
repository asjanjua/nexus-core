/**
 * POST /api/cron/dispatch
 *
 * Orchestration dispatcher cron runner.
 * Claims and executes up to NEXUS_DISPATCH_BATCH_SIZE pending jobs per tick.
 * Jobs run sequentially to avoid LLM token burst.
 *
 * Protected by NEXUS_CRON_SECRET.
 * Recommended schedule: every 2 minutes on Render.
 */
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { runDispatchCycle } from "@/lib/services/dispatcher";

function cronAuthorized(request: Request): boolean {
  const secret = process.env.NEXUS_CRON_SECRET;
  if (!secret) return false;
  const auth   = request.headers.get("authorization") ?? "";
  const header = request.headers.get("x-cron-secret") ?? "";
  return auth === `Bearer ${secret}` || header === secret;
}

export async function POST(request: Request) {
  if (!process.env.NEXUS_CRON_SECRET) return fail("cron_not_configured", 503);
  if (!cronAuthorized(request)) return fail("unauthorized", 401);

  const batchSize = Number(process.env.NEXUS_DISPATCH_BATCH_SIZE ?? "5");
  const ranAt = new Date().toISOString();

  const { processed, succeeded, failed } = await runDispatchCycle(batchSize);

  void repository.pushAudit({
    workspaceId: "_system_",
    type: "dispatch_cron_ran",
    actor: "cron",
    payload: { processed, succeeded, failed, batchSize, ranAt },
  }).catch(() => {});

  return ok({ processed, succeeded, failed, ranAt });
}
