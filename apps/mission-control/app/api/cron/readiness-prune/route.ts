/**
 * Readiness submission prune cron.
 *
 * Deletes expired or already-consumed public readiness claim rows. Protected by
 * NEXUS_CRON_SECRET because this is an operational maintenance endpoint.
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

  const summary = await repository.pruneReadinessSubmissions();
  await repository.pushAudit({
    workspaceId: "public-readiness",
    type: "readiness.prune_ran",
    actor: "cron",
    payload: summary,
  });

  return ok(summary);
}
