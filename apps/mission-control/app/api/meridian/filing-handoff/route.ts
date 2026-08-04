/**
 * Meridian filing handoff.
 *
 * POST /api/meridian/filing-handoff
 *
 * This route exists to make the boundary concrete rather than aspirational.
 * The contract requires a "Human Filing Handoff; named authorized filer;
 * external-channel handoff; no submit credential/control in Meridian."
 *
 * So there are two paths and only one of them succeeds:
 *
 *   action: "handoff"  -> records that the pack was handed to a named human
 *                         filer, with the external channel they will use.
 *                         This is the legitimate act.
 *
 *   action: "submit" | "file" | "certify" | "sign"
 *                      -> REFUSED with 403 and an audit event
 *                         (meridian.filing_blocked). Meridian holds no
 *                         regulator credential and must never appear to.
 *
 * The refusal is the feature. A regulator asking "could your system have filed
 * this itself?" gets an answer from the audit trail, not from a code review.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { guardForbiddenAction } from "@/lib/api-forbidden";

const bodySchema = z.object({
  /** What the caller is asking Meridian to do. */
  action: z.string().min(1).max(60),
  /** Required for a handoff: the human who will actually submit. */
  filerName: z.string().min(1).max(160).optional(),
  /** The regulator's own channel, e.g. "SBP portal", "courier", "email". */
  channel: z.string().min(1).max(160).optional(),
  note: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);
  const { action, filerName, channel, note } = parsed.data;

  // Forbidden path first, so an attempt is recorded before anything else runs.
  const blocked = await guardForbiddenAction({
    product: "meridian",
    action,
    workspaceId: auth.workspaceId,
    actor: auth.userId,
    context: { filerName: filerName ?? null, channel: channel ?? null },
  });
  if (blocked) return blocked;

  if (action !== "handoff") {
    return fail("unsupported_action", 400);
  }

  // A handoff without a named human and a channel is not a handoff. Refusing
  // here keeps "who submitted it, and through what" answerable later.
  if (!filerName || !channel) {
    return fail("handoff_requires_named_filer_and_channel", 400);
  }

  const scope = await repository.getMeridianScope(auth.workspaceId);
  if (!scope) return fail("no_regulatory_scope_set", 409);

  await repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "meridian.filing_handoff",
    actor: auth.userId,
    payload: {
      regulator: scope.regulator,
      licenseType: scope.licenseType,
      filerName,
      channel,
      note: note ?? null,
    },
  });

  return ok({
    handedOff: true,
    regulator: scope.regulator,
    filerName,
    channel,
    // Restated in the response so a client cannot render this as "filed".
    boundary:
      "Meridian prepared and handed off this pack. It has not been filed. " +
      `${filerName} submits it to ${scope.regulator} via ${channel}.`,
  });
}
