import { fail, ok } from "@/lib/api";
import { cronAuthorized } from "@/lib/security";
import { runScheduledSynthesis } from "@/lib/services/synthesis-schedule";


export async function POST(request: Request) {
  if (!process.env.NEXUS_CRON_SECRET) return fail("cron_not_configured", 503);
  if (!cronAuthorized(request)) return fail("unauthorized", 401);

  const summary = await runScheduledSynthesis();
  return ok(summary);
}
