/**
 * Vantage deals.
 *
 * GET  /api/vantage/deals   list live deals for the workspace
 * POST /api/vantage/deals   create one
 *
 * A deal is a named diligence scope: which checklist, when the committee sits,
 * who leads the work. It carries no approval state, because Vantage must not
 * mark a deal investable or rejected — see migration 0055 for why that absence
 * is deliberate rather than unfinished.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { vantageDealInputSchema } from "@/lib/contracts";
import { guardForbiddenAction } from "@/lib/api-forbidden";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;
  const includeArchived = new URL(request.url).searchParams.get("archived") === "true";
  return ok({ deals: await repository.listVantageDeals(ctx.workspaceId, includeArchived) });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = vantageDealInputSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // A caller reaching this endpoint with a decision verb is trying to use deal
  // creation as a decision surface. Recorded and refused before anything is
  // written, so the attempt survives in the trail.
  const action = typeof (body as { action?: unknown })?.action === "string"
    ? (body as { action: string }).action
    : "create_deal";
  const blocked = await guardForbiddenAction({
    product: "vantage",
    action,
    workspaceId: ctx.workspaceId,
    actor: ctx.userId,
    context: { name: parsed.data.name },
  });
  if (blocked) return blocked;

  const deal = await repository.createVantageDeal(ctx.workspaceId, ctx.userId, parsed.data);
  // null means no database, not a validation problem. Saying so beats a 500 or
  // a fake success.
  if (!deal) return fail("database_unavailable", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "vantage.deal_created",
      actor: ctx.userId,
      payload: { dealId: deal.id, name: deal.name, dealType: deal.dealType, icDate: deal.icDate },
    })
    .catch(() => {});

  return ok(deal);
}
