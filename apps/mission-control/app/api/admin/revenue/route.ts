/**
 * GET /api/admin/revenue — Pinavia staff revenue dashboard data.
 * Computes MRR, ARR, active subscriber/pilot counts, churn,
 * and plan breakdown from workspace metadata.
 *
 * PLATFORM-WIDE, NOT WORKSPACE-SCOPED. getAdminRevenueSnapshot() selects every
 * row in `workspaces` and sums LLM usage across all of them, so the response is
 * Pinavia's own commercial position: total MRR, subscriber and pilot counts,
 * churn, plan mix, and operational burn.
 *
 * Gated by `requirePlatformAdmin`, NOT `requireScope("admin")`. The latter
 * resolves through `AuthContext.isOrgAdmin`, which is true for every org-less
 * personal workspace — so before this change any self-signed-up user could read
 * the whole company's revenue with a single unauthenticated-looking GET. The
 * `/admin` page was already gated correctly; only the API it fetches was not.
 */

import { ok, fail } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.error) return auth.error;

  try {
    const snap = await repository.getAdminRevenueSnapshot();
    return ok({
      generatedAt: new Date().toISOString(),
      ...snap,
      arrCents: snap.mrrCents * 12,
    });
  } catch (_err) {
    return fail("revenue_report_failed", 500);
  }
}
