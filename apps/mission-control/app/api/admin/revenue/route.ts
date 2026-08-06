/**
 * GET /api/admin/revenue — Admin-gated revenue dashboard data.
 * Computes MRR, ARR, active subscriber/pilot counts, churn,
 * and plan breakdown from workspace metadata.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "admin");
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
