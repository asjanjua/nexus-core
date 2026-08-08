/**
 * Nucleus deliverables — the draft record behind a client release.
 *
 * GET  /api/nucleus/deliverables?engagementId=...
 * POST /api/nucleus/deliverables    create or update a draft
 *
 * This endpoint does NOT release anything. Release goes through
 * /api/nucleus/client-release, which enforces the named partner and the full
 * disclosure triple. Keeping them separate matters: a draft is allowed to be
 * incomplete, and a release is not.
 *
 * THE CAVEAT FIELD IS THREE-VALUED and stays that way end to end.
 *   omitted        leave whatever is stored untouched
 *   explicit null  nobody has answered
 *   []             checked, none outstanding
 * Collapsing null into [] would turn an unanswered deliverable into a positive
 * assurance to a client, which is the most dangerous thing this record could
 * misstate.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { nucleusDeliverableInputSchema } from "@/lib/contracts";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const engagementId = new URL(request.url).searchParams.get("engagementId");
  if (!engagementId) return fail("engagement_id_required", 400);

  // Scoped read first, so an id from another firm cannot return an empty list
  // that reads as "no deliverables yet".
  const engagement = await repository.getNucleusEngagement(ctx.workspaceId, engagementId);
  if (!engagement) return fail("engagement_not_found", 404);

  return ok({ deliverables: await repository.listNucleusDeliverables(ctx.workspaceId, engagementId) });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = nucleusDeliverableInputSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const engagement = await repository.getNucleusEngagement(ctx.workspaceId, parsed.data.engagementId);
  if (!engagement) return fail("engagement_not_found", 404);

  const id = typeof (body as { id?: unknown })?.id === "string" ? (body as { id: string }).id : undefined;
  const deliverable = await repository.upsertNucleusDeliverable(ctx.workspaceId, ctx.userId, {
    ...parsed.data,
    id,
  });
  if (!deliverable) return fail("database_unavailable", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: id ? "nucleus.deliverable_updated" : "nucleus.deliverable_created",
      actor: ctx.userId,
      payload: {
        deliverableId: deliverable.id,
        engagementId: deliverable.engagementId,
        title: deliverable.title,
        // Three states, recorded as three states.
        caveatsAnswered: deliverable.unresolvedCaveats !== null,
        caveatCount: deliverable.unresolvedCaveats?.length ?? null,
      },
    })
    .catch(() => {});

  return ok(deliverable);
}
