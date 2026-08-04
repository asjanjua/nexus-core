/**
 * Quorum minutes sign-off.
 *
 * POST /api/board/minutes/signoff
 *
 * The contract requires a "Human authentication gate with named chair/
 * secretary, consequence preview, and disabled finalisation control without
 * role/record prerequisites", and the registry boundary is explicit: Quorum
 * "must not approve, sign, file, send, or make a board record final
 * automatically."
 *
 * The distinction from Meridian matters. A regulatory filing leaves the system
 * entirely — a human submits it through the regulator's own channel. Minutes
 * sign-off happens INSIDE the system, so the boundary cannot be "we hand it
 * over"; it has to be "the person doing this is provably the chair".
 *
 * That is why this route binds to the accepted reviewer seat rather than
 * accepting a chair's name as text. A free-text name is not an authentication
 * gate — anyone could type "the Chair" and produce a record that looks signed.
 * The same identity binding already governs recommendation approvals; this
 * reuses it rather than inventing a second, weaker notion of who may act.
 *
 * Two paths:
 *   action: "record_signoff" -> a bound chair records their own sign-off.
 *                               A human act, recorded. Not a machine act.
 *   action: "finalize_minutes" | "sign" | "file" | "approve_board_action"
 *                            -> REFUSED, audited as quorum.finalisation_blocked.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { guardForbiddenAction } from "@/lib/api-forbidden";

const bodySchema = z.object({
  action: z.string().min(1).max(60),
  /** Which meeting record is being signed off. */
  meetingRef: z.string().min(1).max(200).optional(),
  /** Corrections the chair is recording alongside the sign-off. */
  corrections: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);
  const { action, meetingRef, corrections } = parsed.data;

  // Forbidden check first: the attempt must be recorded before any other
  // validation can turn it into a generic 400 and lose the governance signal.
  const blocked = await guardForbiddenAction({
    product: "quorum",
    action,
    workspaceId: ctx.workspaceId,
    actor: ctx.userId,
    context: { meetingRef: meetingRef ?? null },
  });
  if (blocked) return blocked;

  if (action !== "record_signoff") return fail("unsupported_action", 400);
  if (!meetingRef) return fail("signoff_requires_meeting_reference", 400);

  // Role prerequisite. The contract requires finalisation to be unavailable
  // without it, so this is a hard gate rather than a warning.
  const seat = await repository.getAcceptedReviewerSeat(ctx.workspaceId).catch(() => null);
  if (!seat) {
    await repository
      .pushAudit({
        workspaceId: ctx.workspaceId,
        type: "quorum.finalisation_blocked",
        actor: ctx.userId,
        payload: {
          reason: "no_accepted_reviewer_seat",
          attemptedAction: action,
          meetingRef,
        },
      })
      .catch(() => {});
    return fail("signoff_requires_accepted_reviewer_seat", 409);
  }

  // Identity binding, mirroring the approvals route: a session caller must BE
  // the bound reviewer. Bearer/admin tokens remain a break-glass path and are
  // audited as not-bound rather than silently permitted.
  const boundToCaller = ctx.authType !== "session" || ctx.userId === seat.clerkUserId;
  if (!boundToCaller) {
    await repository
      .pushAudit({
        workspaceId: ctx.workspaceId,
        type: "quorum.finalisation_blocked",
        actor: ctx.userId,
        payload: {
          reason: "caller_is_not_the_bound_reviewer",
          attemptedAction: action,
          meetingRef,
          reviewerSeatId: seat.id,
        },
      })
      .catch(() => {});
    return fail("signoff_requires_bound_reviewer", 403);
  }

  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "quorum.minutes_signed_off",
    actor: ctx.userId,
    payload: {
      meetingRef,
      reviewerSeatId: seat.id,
      // Recorded so the trail shows this was a human act by a bound identity,
      // not a system finalisation.
      signedByBoundReviewer: ctx.authType === "session",
      breakGlass: ctx.authType !== "session",
      corrections: corrections ?? null,
    },
  });

  return ok({
    signedOff: true,
    meetingRef,
    reviewerSeatId: seat.id,
    boundary:
      "Recorded as a human sign-off by the bound reviewer. Quorum did not " +
      "finalise, sign, or file this record, and it is not a statutory filing.",
  });
}
