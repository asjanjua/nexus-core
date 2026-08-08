/**
 * Nucleus engagements.
 *
 * GET  /api/nucleus/engagements   live engagements for this firm's workspace
 * POST /api/nucleus/engagements   create one
 *
 * An engagement is a client assignment run under the firm's own methodology.
 * It holds no billing, rates, or utilisation — see migration 0057. A
 * governance platform that also owns the commercial record has a conflict the
 * moment a caveat becomes inconvenient.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { nucleusEngagementInputSchema } from "@/lib/contracts";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;
  return ok({ engagements: await repository.listNucleusEngagements(ctx.workspaceId) });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = nucleusEngagementInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  const engagement = await repository.createNucleusEngagement(ctx.workspaceId, ctx.userId, parsed.data);
  if (!engagement) return fail("database_unavailable", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "nucleus.engagement_created",
      actor: ctx.userId,
      payload: {
        engagementId: engagement.id,
        reference: engagement.reference,
        client: engagement.clientName,
        // Recorded even when absent, so "no partner yet" is a fact in the
        // trail rather than a missing field.
        partner: engagement.partner,
      },
    })
    .catch(() => {});

  return ok(engagement);
}
