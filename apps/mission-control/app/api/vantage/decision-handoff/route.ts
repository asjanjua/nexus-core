/**
 * Vantage IC decision handoff.
 *
 * POST /api/vantage/decision-handoff
 *
 * Third boundary, third shape. Meridian hands off to an external channel;
 * Quorum binds to an identity inside the system. Vantage does neither: the
 * decision happens at an investment committee meeting, off-system, with no
 * channel to hand to and no seat to bind. So what has to be enforced here is
 * COMPLETENESS OF HUMAN JUDGMENT ATTRIBUTION.
 *
 * Two registry boundaries drive that:
 *
 *   no-investment-decision  — "must not mark a deal as approved, investable,
 *                              or rejected on behalf of the IC."
 *   advisor-judgment-visible — "Every recommendation posture must identify the
 *                              human reviewer, material caveats, and evidence
 *                              behind the judgment."
 *
 * The second is the one with teeth here. A packet that carries a posture but
 * no named advisor is how a machine opinion quietly becomes the committee's
 * basis for a decision. This route refuses to package that, which is a
 * stronger guarantee than merely refusing to press an Approve button nobody
 * built.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { guardForbiddenAction } from "@/lib/api-forbidden";

const bodySchema = z.object({
  action: z.string().min(1).max(60),
  /** The deal this packet belongs to. */
  dealRef: z.string().min(1).max(200).optional(),
  /** Named human who owns the decision at the IC. Not the system. */
  decisionOwner: z.string().min(1).max(160).optional(),
  /**
   * A recommendation posture, if the packet carries one. Optional by design:
   * a packet may legitimately present findings with no posture at all. But if
   * a posture IS present, the advisor attribution below becomes mandatory.
   */
  posture: z.string().max(400).optional(),
  /** The human whose judgment the posture represents. */
  advisorName: z.string().max(160).optional(),
  /** Material caveats behind the posture. */
  caveats: z.string().max(4000).optional(),
  /** Questions the IC must answer. An empty list must be stated, not implied. */
  openQuestions: z.array(z.string().min(1).max(500)).default([]),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);
  const { action, dealRef, decisionOwner, posture, advisorName, caveats, openQuestions } = parsed.data;

  // Attempt is recorded before any other validation can downgrade it to a
  // generic 400 and lose the governance signal.
  const blocked = await guardForbiddenAction({
    product: "vantage",
    action,
    workspaceId: ctx.workspaceId,
    actor: ctx.userId,
    context: { dealRef: dealRef ?? null },
  });
  if (blocked) return blocked;

  if (action !== "handoff") return fail("unsupported_action", 400);
  if (!dealRef) return fail("handoff_requires_deal_reference", 400);

  // The IC decides, so a packet with no named human owning that decision has
  // nowhere to land. Refusing here keeps "who decided" answerable later.
  if (!decisionOwner) return fail("handoff_requires_named_decision_owner", 400);

  // advisor-judgment-visible, enforced rather than displayed. A posture with
  // no named advisor is a machine opinion wearing a human's authority.
  if (posture && !advisorName) {
    await repository
      .pushAudit({
        workspaceId: ctx.workspaceId,
        type: "vantage.decision_blocked",
        actor: ctx.userId,
        payload: {
          reason: "posture_without_named_advisor",
          attemptedAction: action,
          dealRef,
        },
      })
      .catch(() => {});
    return fail("posture_requires_named_advisor", 422);
  }

  if (posture && !caveats) {
    return fail("posture_requires_material_caveats", 422);
  }

  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "vantage.decision_handoff",
    actor: ctx.userId,
    payload: {
      dealRef,
      decisionOwner,
      // Recorded explicitly rather than inferred from presence, so a later
      // reader can tell "no posture was offered" from "the field was dropped".
      hasPosture: Boolean(posture),
      advisorName: advisorName ?? null,
      openQuestionCount: openQuestions.length,
    },
  });

  return ok({
    handedOff: true,
    dealRef,
    decisionOwner,
    openQuestionCount: openQuestions.length,
    boundary:
      "Packaged for the investment committee. Vantage has not approved, " +
      `rejected, or cleared this deal. ${decisionOwner} owns the decision.`,
  });
}
