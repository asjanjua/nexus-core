/**
 * Nucleus reviewer console: real state -> workbench rows.
 *
 * Pure, so the branching is testable; the screen only fetches and renders.
 *
 * WHAT THIS SCREEN IS FOR. Nucleus lets an advisory firm put its own brand on
 * the work. The thing being sold is that the trust layer survives the
 * rebrand — a client sees where figures came from, what is unresolved, and who
 * reviewed it, whatever the cover page says. So this console has to show the
 * firm what it cannot remove, sourced from the same constant the release route
 * enforces, not a copy that could drift in the firm's favour.
 *
 * BOUNDARY. Nothing here releases anything. The release gate additionally
 * demands a named partner and the full disclosure triple; a row reading
 * "Ready" means ready for partner review, never ready for a client.
 */

import type { PilotHandoffItem } from "@/components/pilot-handoff-workbench";
import {
  PROTECTED_TRUST_ELEMENTS,
  PROTECTED_TRUST_ELEMENT_LABELS,
} from "@/lib/forbidden-actions";

export type IntegritySummary = {
  documents: number;
  clean: number;
  withFindings: number;
  /** Mean parse quality across records, 0..1. */
  parseQualityScore: number;
  findingCount: number;
};

export type ReviewReadinessInput = {
  integrity: IntegritySummary;
  /** Documents the extractor could not pull a citable span from. */
  missingSourceSpanCount: number;
  /** The accepted reviewer seat holder, if any. */
  reviewerName: string | null;
};

/** Below this mean parse quality, citations are not safe to show a client. */
export const PARSE_QUALITY_FLOOR = 0.6;

export function buildReviewerConsoleItems(input: ReviewReadinessInput): PilotHandoffItem[] {
  const { integrity: g } = input;
  const items: PilotHandoffItem[] = [];

  // 1. The deliverable itself. Never computed: whether a conclusion is right
  //    is the partner's to own, and that ownership is what the client is
  //    paying the firm for.
  items.push({
    label: "Client deliverable",
    detail:
      "Draft sections need partner-owned conclusions and citation review. Nucleus does not write the firm's advice or approve it.",
    state: "Draft",
    tone: "draft",
  });

  // 2. Evidence appendix. This is what a client can click through to, so a
  //    weak citation here is worse than no citation: it looks checked.
  if (g.documents === 0) {
    items.push({
      label: "Evidence appendix",
      detail:
        "No documents have been ingested for this engagement, so there is nothing to cite. A client-facing appendix cannot be prepared.",
      state: "Empty",
      tone: "blocked",
    });
  } else if (input.missingSourceSpanCount > 0 || g.parseQualityScore < PARSE_QUALITY_FLOOR) {
    const reasons: string[] = [];
    if (input.missingSourceSpanCount > 0) {
      reasons.push(
        `${input.missingSourceSpanCount} document${input.missingSourceSpanCount === 1 ? " has" : "s have"} no citable source span`
      );
    }
    if (g.parseQualityScore < PARSE_QUALITY_FLOOR) {
      reasons.push("mean extraction quality is below the level a client citation should rely on");
    }
    items.push({
      label: "Evidence appendix",
      detail: `${reasons.join("; ")}. A citation a client cannot follow back to a source is worse than no citation, because it looks verified.`,
      state: "Not client-safe",
      tone: "blocked",
    });
  } else if (g.withFindings > 0) {
    items.push({
      label: "Evidence appendix",
      detail: `${g.clean} of ${g.documents} documents are clean; ${g.withFindings} carry ${g.findingCount} extraction finding${g.findingCount === 1 ? "" : "s"} that should be resolved or disclosed before the client sees the appendix.`,
      state: "Ready with findings",
      tone: "review",
    });
  } else {
    items.push({
      label: "Evidence appendix",
      detail: `All ${g.documents} documents parsed cleanly with citable spans. Whether they support the conclusions drawn is still the reviewer's judgement.`,
      state: "Ready",
      tone: "ready",
    });
  }

  // 3. Named partner. The release gate refuses without one, so surfacing it
  //    here turns a late 422 into something fixable before the partner is
  //    ready to press release.
  items.push(
    input.reviewerName
      ? {
          label: "Named partner reviewer",
          detail: `${input.reviewerName} holds the accepted reviewer seat and would be named on the release.`,
          state: "Named",
          tone: "ready",
        }
      : {
          label: "Named partner reviewer",
          detail:
            "No reviewer seat has been accepted. Release is refused without a named partner, because without one Nucleus would be the de facto author of client advice.",
          state: "Missing",
          tone: "blocked",
        }
  );

  // 4. The trust contract. Static by design and always locked — that is the
  //    point. Enumerated from the enforced constant so the screen cannot
  //    promise less than the route delivers.
  items.push({
    label: "Trust contract",
    detail: `Fixed for every client view and not removable by branding: ${PROTECTED_TRUST_ELEMENTS.map(
      (key) => PROTECTED_TRUST_ELEMENT_LABELS[key]
    ).join("; ")}.`,
    state: "Locked",
    tone: "review",
  });

  return items;
}

export function countReviewBlockers(items: PilotHandoffItem[]): number {
  return items.filter((i) => i.tone === "blocked").length;
}
