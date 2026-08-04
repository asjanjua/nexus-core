/**
 * Filing-pack completeness: coverage state -> workbench rows.
 *
 * Pure, so the branching can be tested. The screen (see
 * components/meridian-filing-pack-workbench.tsx) only fetches and renders.
 *
 * The rule this file exists to enforce: a row is only "Ready" when something
 * real makes it so. The previous screen hardcoded four rows, one of which
 * always read "Caveat register — Blocked", which is worse than a placeholder
 * because it looks like a finding about the user's actual pack.
 *
 * "Ready" throughout means ready for a qualified reviewer to look at. It never
 * means ready to file. Meridian may prepare and organize; it must not file,
 * submit, certify, or sign.
 */

import type { PilotHandoffItem } from "@/components/pilot-handoff-workbench";

export type FilingPackTotals = {
  total: number;
  covered: number;
  criticalGaps: number;
  restrictedExcluded: number;
  untypedDocuments: number;
  inferredDocuments: number;
};

export type FilingPackInput = {
  regulator: string;
  licenseType: string;
  reviewerName: string | null;
  packSource: "dedicated" | "generic";
  totals: FilingPackTotals;
};

export function buildFilingPackItems(input: FilingPackInput): PilotHandoffItem[] {
  const { totals: t } = input;
  const items: PilotHandoffItem[] = [];

  // 1. Requirement matrix.
  items.push(
    input.packSource === "generic"
      ? {
          label: "Requirement matrix",
          detail:
            "No purpose-built requirement pack exists for this licence, so a generic baseline is in use. The matrix is not the regulator's list and cannot be presented as complete.",
          state: "Not reviewable",
          tone: "blocked",
        }
      : {
          label: "Requirement matrix",
          detail: `${t.total} requirements selected for ${input.regulator} · ${input.licenseType}, each with the evidence tags that would satisfy it.`,
          state: "Ready",
          tone: "ready",
        }
  );

  // 2. Evidence index. Traceability is the claim being made, so anything that
  //    weakens the link between a requirement and a source belongs here rather
  //    than being quietly absorbed into a percentage.
  const caveats: string[] = [];
  if (t.untypedDocuments > 0) {
    caveats.push(
      `${t.untypedDocuments} document${t.untypedDocuments === 1 ? "" : "s"} could not be identified and support nothing`
    );
  }
  if (t.inferredDocuments > 0) {
    caveats.push(`${t.inferredDocuments} identified from contents rather than filename`);
  }
  if (t.restrictedExcluded > 0) {
    caveats.push(`${t.restrictedExcluded} excluded by access scope`);
  }
  items.push({
    label: "Evidence index",
    detail:
      `${t.covered} of ${t.total} requirements have a traceable document.` +
      (caveats.length ? ` Caveats: ${caveats.join("; ")}.` : ""),
    state: t.covered === 0 ? "Empty" : caveats.length ? "Ready with caveats" : "Ready",
    tone: t.covered === 0 ? "blocked" : caveats.length ? "review" : "ready",
  });

  // 3. Caveat register. Critical gaps are what genuinely blocks a handoff.
  items.push(
    t.criticalGaps > 0
      ? {
          label: "Caveat register",
          detail: `${t.criticalGaps} critical requirement${t.criticalGaps === 1 ? " has" : "s have"} no traceable evidence. Each needs a named owner or a written caveat before a reviewer sees the pack.`,
          state: "Blocked",
          tone: "blocked",
        }
      : {
          label: "Caveat register",
          detail:
            "No critical requirement is missing a source. Evidence quality and adequacy are still open questions for the reviewer, and any known limitation should be written down here.",
          state: "Open for entry",
          tone: "review",
        }
  );

  // 4. Named reviewer. The handoff is to a person; without one there isn't one.
  items.push(
    input.reviewerName
      ? {
          label: "Qualified reviewer",
          detail: `${input.reviewerName} is named on the regulatory scope for this workspace.`,
          state: "Named",
          tone: "ready",
        }
      : {
          label: "Qualified reviewer",
          detail:
            "No reviewer is named on the regulatory scope. A pack with no named reviewer cannot be routed, because there is nobody accountable for what it says.",
          state: "Missing",
          tone: "blocked",
        }
  );

  // 5. Submission memo. Deliberately never computed: whether a narrative is
  //    accurate and adequate is a judgement, and a green tick here would be
  //    the product asserting something it cannot know.
  items.push({
    label: "Submission memo",
    detail:
      "Whether the narrative is accurate and adequate is a judgement, not a calculation. This stays a draft until a qualified reviewer edits and signs it off.",
    state: "Draft",
    tone: "draft",
  });

  return items;
}

/** Rows that must be resolved or caveated before a reviewer is asked to look. */
export function countBlockers(items: PilotHandoffItem[]): number {
  return items.filter((i) => i.tone === "blocked").length;
}
