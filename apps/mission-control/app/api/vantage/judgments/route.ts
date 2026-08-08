/**
 * Advisor judgment log.
 *
 * GET  /api/vantage/judgments?dealId=...   the sequence for one deal
 * POST /api/vantage/judgments              append a judgment
 *
 * APPEND-ONLY. There is no PUT and no DELETE, deliberately. The registry
 * boundary "advisor-judgment-visible" is about being able to say who concluded
 * what and on what basis; an editable log cannot answer that, because the
 * version a committee saw would be gone. A changed view is a new row that
 * supersedes its predecessor.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { vantageJudgmentInputSchema } from "@/lib/contracts";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const dealId = new URL(request.url).searchParams.get("dealId");
  if (!dealId) return fail("deal_id_required", 400);

  // Scoped read of the deal first: a judgment list is only meaningful for a
  // deal this workspace owns, and this stops an id from another tenant
  // returning an empty list that looks like "no judgments yet".
  const deal = await repository.getVantageDeal(ctx.workspaceId, dealId);
  if (!deal) return fail("deal_not_found", 404);

  return ok({ judgments: await repository.listVantageJudgments(ctx.workspaceId, dealId) });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = vantageJudgmentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  const deal = await repository.getVantageDeal(ctx.workspaceId, parsed.data.dealId);
  if (!deal) return fail("deal_not_found", 404);
  if (deal.archivedAt) return fail("deal_archived", 409);

  const judgment = await repository.appendVantageJudgment(ctx.workspaceId, ctx.userId, parsed.data);
  if (!judgment) return fail("database_unavailable", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "vantage.judgment_recorded",
      actor: ctx.userId,
      payload: {
        judgmentId: judgment.id,
        dealId: judgment.dealId,
        subject: judgment.subject,
        // The advisor is recorded separately from the actor on purpose: the
        // person at the keyboard is often not the person whose judgment it is.
        advisor: judgment.advisor,
        supersedes: parsed.data.supersedes ?? null,
        evidenceCount: judgment.evidenceRefs.length,
      },
    })
    .catch(() => {});

  return ok(judgment);
}
