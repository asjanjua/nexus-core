/**
 * Nucleus client release gate.
 *
 * POST /api/nucleus/client-release
 *
 * Fourth boundary, fourth shape. Meridian hands off to an external channel;
 * Quorum binds to an identity; Vantage requires judgment attribution. Nucleus
 * is about DISCLOSURE COMPLETENESS BEFORE RELEASE TO A THIRD PARTY — the
 * client is outside the firm, and once something reaches them it cannot be
 * unseen.
 *
 * Three registry boundaries drive this:
 *
 *   partner-owned-advice   — "the advisory firm remains responsible for
 *                             recommendations, approvals, and client-facing
 *                             conclusions."
 *   no-hidden-client-output — "Anything shown in a client portal must expose
 *                             source coverage, reviewer status, and unresolved
 *                             caveats before it is published."
 *   fixed-trust-layer      — "must not alter core status colours, evidence
 *                             provenance, approval boundaries, audit labels,
 *                             or consequence previews."
 *
 * The second is enforced literally: a release missing any of the disclosure
 * triple is refused. The third is why `suppress` flags are treated as an
 * attempt at `conceal_trust_mechanics` rather than a formatting preference —
 * a white-label firm may restyle the client view but may not strip what makes
 * it trustworthy. That distinction IS the governance guarantee Nucleus sells,
 * so it has to fail loudly rather than degrade quietly.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { guardForbiddenAction } from "@/lib/api-forbidden";

const bodySchema = z.object({
  action: z.string().min(1).max(60),
  engagementRef: z.string().min(1).max(200).optional(),
  deliverableRef: z.string().min(1).max(200).optional(),
  /** The partner who reviewed and takes responsibility. Not the system. */
  partnerName: z.string().min(1).max(160).optional(),
  /** Disclosure triple, all required for a release. */
  sourceCoverage: z.string().max(2000).optional(),
  reviewerStatus: z.string().max(400).optional(),
  /**
   * Unresolved caveats. An EMPTY ARRAY is a valid, meaningful answer ("none
   * outstanding"); an ABSENT field is not. The distinction matters because
   * "we checked and there are none" and "nobody looked" must not render the
   * same way to a client.
   */
  unresolvedCaveats: z.array(z.string().min(1).max(500)).optional(),
  /**
   * Requests to hide parts of the fixed trust layer. Present so the attempt
   * can be refused and audited rather than silently ignored.
   */
  suppress: z.array(z.string().min(1).max(60)).default([]),
});

/** Elements of the trust layer a firm may never remove from a client view. */
const PROTECTED_TRUST_ELEMENTS = [
  "provenance",
  "caveats",
  "reviewer",
  "audit",
  "consequence",
  "status_colours",
];

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);
  const {
    action,
    engagementRef,
    deliverableRef,
    partnerName,
    sourceCoverage,
    reviewerStatus,
    unresolvedCaveats,
    suppress,
  } = parsed.data;

  // Attempt recorded before anything can downgrade it to a generic 400.
  const blocked = await guardForbiddenAction({
    product: "nucleus",
    action,
    workspaceId: ctx.workspaceId,
    actor: ctx.userId,
    context: { engagementRef: engagementRef ?? null, deliverableRef: deliverableRef ?? null },
  });
  if (blocked) return blocked;

  if (action !== "release_to_client") return fail("unsupported_action", 400);
  if (!engagementRef || !deliverableRef) {
    return fail("release_requires_engagement_and_deliverable", 400);
  }

  // fixed-trust-layer. Asking to hide provenance, caveats, reviewer state, or
  // the audit label is the concealment action itself, not a display option.
  const forbiddenSuppression = suppress.filter((item) =>
    PROTECTED_TRUST_ELEMENTS.includes(item.toLowerCase())
  );
  if (forbiddenSuppression.length > 0) {
    return (
      (await guardForbiddenAction({
        product: "nucleus",
        action: "conceal_trust_mechanics",
        workspaceId: ctx.workspaceId,
        actor: ctx.userId,
        context: { engagementRef, deliverableRef, requestedSuppression: forbiddenSuppression },
      })) ?? fail("conceal_trust_mechanics", 403)
    );
  }

  // partner-owned-advice. Without a named partner the firm has not taken
  // responsibility, and Nucleus would be the de facto author of client advice.
  if (!partnerName) return fail("release_requires_named_partner", 422);

  // no-hidden-client-output. All three disclosures, checked for presence
  // rather than truthiness so an empty caveat list still counts as answered.
  const missing: string[] = [];
  if (!sourceCoverage) missing.push("sourceCoverage");
  if (!reviewerStatus) missing.push("reviewerStatus");
  if (unresolvedCaveats === undefined) missing.push("unresolvedCaveats");

  if (missing.length > 0) {
    await repository
      .pushAudit({
        workspaceId: ctx.workspaceId,
        type: "nucleus.publish_blocked",
        actor: ctx.userId,
        payload: {
          reason: "incomplete_client_disclosure",
          missing,
          engagementRef,
          deliverableRef,
        },
      })
      .catch(() => {});
    return fail(`release_requires_disclosure: ${missing.join(", ")}`, 422);
  }

  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "nucleus.client_release",
    actor: ctx.userId,
    payload: {
      engagementRef,
      deliverableRef,
      partnerName,
      // Count, not contents: the audit records that caveats were disclosed
      // without duplicating client material into the trail.
      unresolvedCaveatCount: unresolvedCaveats!.length,
      reviewerStatus,
    },
  });

  return ok({
    released: true,
    engagementRef,
    deliverableRef,
    partnerName,
    unresolvedCaveatCount: unresolvedCaveats!.length,
    boundary:
      `Released under ${partnerName}'s partner review. Nucleus did not approve ` +
      "this on the firm's behalf, and the provenance, reviewer status, and " +
      "caveat disclosures travel with it.",
  });
}
