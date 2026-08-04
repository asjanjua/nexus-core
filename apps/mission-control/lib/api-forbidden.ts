/**
 * Route-level forbidden-action guard.
 *
 * Wraps `checkForbiddenAction` with the two things a route must also do: write
 * the contract-named audit event, and return a consistent 403 body.
 *
 * THE AUDIT WRITE IS THE POINT. A blocked attempt that leaves no trace is
 * indistinguishable from an attempt that never happened. When a regulator asks
 * "did your system ever try to file this itself", the answer has to come from
 * the log, not from someone's memory of the code.
 *
 * Unlike most audit writes in this codebase, this one is AWAITED. Elsewhere we
 * fire-and-forget so a logging failure cannot break a user action; here the
 * record is the product feature, so it is worth the latency. It is still
 * wrapped so a write failure cannot convert a clean refusal into a 500 — the
 * refusal must hold even if the log does not.
 */

import { fail } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { captureHandledError } from "@/lib/observability/sentry";
import { checkForbiddenAction, type GovernedProduct } from "@/lib/forbidden-actions";

/**
 * Returns a 403 Response when the action is forbidden, or null when allowed.
 *
 * Usage in a route handler:
 *
 *   const blocked = await guardForbiddenAction({
 *     product: "meridian", action: "submit",
 *     workspaceId: auth.workspaceId, actor: auth.userId,
 *   });
 *   if (blocked) return blocked;
 */
export async function guardForbiddenAction(input: {
  product: GovernedProduct;
  action: string;
  workspaceId: string;
  actor: string;
  /** Extra context for the audit payload, e.g. the record being acted on. */
  context?: Record<string, unknown>;
}): Promise<Response | null> {
  const check = checkForbiddenAction(input.product, input.action);
  if (check.allowed) return null;

  try {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: check.event,
      actor: input.actor,
      payload: {
        product: check.product,
        attemptedAction: check.action,
        // Recorded so the trail shows the system refused and where it pointed
        // the human instead, not merely that something was denied.
        refusal: check.refusal,
        humanPath: check.humanPath,
        ...(input.context ?? {}),
      },
    });
  } catch (error) {
    // The refusal stands regardless. Surface the logging failure rather than
    // swallowing it, because a silently unaudited block is a governance gap.
    captureHandledError(error, {
      route: "guardForbiddenAction",
      errorType: check.event,
      workspaceId: input.workspaceId,
    });
  }

  return fail(check.refusal, 403);
}
