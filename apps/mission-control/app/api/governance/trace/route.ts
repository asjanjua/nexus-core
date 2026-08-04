/**
 * GET /api/governance/trace
 *
 * Read-only trail of how a recent leadership answer was produced:
 * evidence -> agent output -> decision -> action, with any red-team /
 * output-gate checks attached to the agent output that triggered them,
 * plus the parallel evidence -> recommendation chain. Assembled on demand
 * from existing tables (dispatcher, agent_outputs, decisions, actions,
 * recommendations, audit_events) — no new schema.
 *
 * Query params: role (optional), days (default 7, max 30), limit (default 12, max 25).
 *
 * Scope: read:dashboard
 */

import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { buildGovernanceTrace } from "@/lib/services/governance-trace";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? undefined;
  const days = url.searchParams.get("days") ? Number(url.searchParams.get("days")) : undefined;
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;

  const graph = await buildGovernanceTrace(ctx.workspaceId, { role, days, limit });
  return ok(graph);
}
