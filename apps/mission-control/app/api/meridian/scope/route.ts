/**
 * Meridian regulatory scope (migration 0040).
 *
 * GET  /api/meridian/scope — the workspace's current scope, or null.
 * POST /api/meridian/scope — create or update it (one scope per workspace).
 *
 * This is the first persisted object in the Submission Room. Everything
 * downstream in the submission arc — requirement library, evidence coverage,
 * gap triage, filing pack — selects its requirement set from this record, so
 * a bad value here silently produces an empty or wrong requirement set rather
 * than an error. That is why licenseStatus is a parsed enum and not a string.
 *
 * BOUNDARY: this endpoint records what the user declared. It never records,
 * infers, or asserts a regulatory conclusion, and it does not file, submit,
 * certify, or sign anything. See meridianRegulatoryBoundaries.
 */

import { randomUUID } from "crypto";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { meridianScopeInputSchema } from "@/lib/contracts";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const scope = await repository.getMeridianScope(auth.workspaceId);
  return ok({ scope, configured: Boolean(scope) });
}

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = meridianScopeInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "invalid_request", 400);
  }

  // Reject a deadline that is not a real calendar date. The hub renders a
  // days-remaining KPI from it, and an unparseable value would surface as NaN
  // next to a regulator's name.
  if (parsed.data.deadline) {
    const d = new Date(parsed.data.deadline);
    if (Number.isNaN(d.getTime())) return fail("invalid_deadline", 400);
  }

  const existing = await repository.getMeridianScope(auth.workspaceId);

  const scope = await repository.upsertMeridianScope({
    id: `mrs_${randomUUID()}`,
    workspaceId: auth.workspaceId,
    createdBy: auth.userId,
    data: parsed.data,
  });

  void repository
    .pushAudit({
      workspaceId: auth.workspaceId,
      type: existing ? "meridian_scope.updated" : "meridian_scope.set",
      actor: auth.userId,
      payload: {
        jurisdiction: scope.jurisdiction,
        regulator: scope.regulator,
        licenseType: scope.licenseType,
        licenseStatus: scope.licenseStatus,
      },
    })
    .catch(() => {});

  return ok({ scope }, existing ? 200 : 201);
}
