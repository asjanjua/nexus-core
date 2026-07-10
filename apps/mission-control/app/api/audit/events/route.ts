/**
 * GET /api/audit/events
 *
 * Returns the most recent audit events for the authenticated workspace.
 * Covers ingestion, evidence deletion, approvals, profile changes,
 * recommendation generation, and auth events.
 *
 * Scope: admin
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

  const events = await repository.getAuditEvents(ctx.workspaceId, limit);

  if (!events) return fail("audit_unavailable", 503);

  return ok({ events, total: events.length });
}
