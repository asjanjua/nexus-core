import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { actionInputSchema } from "@/lib/contracts";

// GET /api/actions — list actions, optionally filtered by decisionId or status
export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const url = new URL(request.url);
  const decisionId = url.searchParams.get("decisionId") ?? undefined;
  const status = url.searchParams.get("status") as "open" | "done" | "deferred" | "cancelled" | undefined ?? undefined;

  const items = await repository.listActions(ctx.workspaceId, decisionId, status);
  return ok({ actions: items, total: items.length });
}

// POST /api/actions — create an action under a decision
export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("Invalid JSON", 400); }

  const parsed = actionInputSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.message, 400);

  // Referential-integrity gate: the parent decision must belong to the caller's
  // workspace. Without this, an action could be attached to a foreign or
  // nonexistent decisionId. Actions are always created in ctx.workspaceId, so
  // this is integrity hardening, not a tenant-isolation fix.
  const decisions = await repository.listDecisions(ctx.workspaceId);
  if (!decisions.some((decision) => decision.id === parsed.data.decisionId)) {
    return fail("decision_not_found", 404);
  }

  const action = await repository.createAction(ctx.workspaceId, parsed.data, ctx.userId);
  return ok({ action }, 201);
}
