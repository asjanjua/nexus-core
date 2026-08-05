/**
 * Which documents most need a human to say what they are.
 *
 * Pure, so the ordering rule is testable without a database.
 *
 * ORDERED BY WHAT EACH ONE WOULD UNBLOCK, not by date or filename. Thirty
 * unidentified documents is a wall a reviewer bounces off. "This one unblocks
 * three critical requirements" is a next action. The ordering is the feature;
 * the list is just how it is shown.
 *
 * "Unblocks" is deliberately optimistic in one direction and honest in the
 * other: it counts requirements that are currently uncovered and that this
 * document COULD satisfy if it turned out to be one of the plausible types. It
 * is a reason to look, never a claim about what the document is.
 */

import { weakContentHints, type ResolvedDocumentTypes } from "@/lib/domain/document-type-classifier";

export type QueueCandidate = {
  evidenceId: string;
  sourcePath: string;
  extractionConfidence: number;
  hasText: boolean;
  /** Extracted text, used only to derive a weak suggestion. */
  text?: string | null;
  resolved: ResolvedDocumentTypes;
};

export type QueueItem = {
  evidenceId: string;
  fileName: string;
  /** Why the classifier could not place it, in the reviewer's language. */
  reason: string;
  /** Uncovered requirements this document could plausibly satisfy. */
  unblocks: { critical: number; high: number; medium: number; total: number };
  /** A weak filename hint, offered but never pre-filled. */
  suggestion: string | null;
};

const SEVERITY_WEIGHT = { critical: 100, high: 10, medium: 1 } as const;

function baseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/**
 * Documents needing attention, most valuable first.
 *
 * Excludes anything a reviewer has already ruled on, including the ones they
 * marked as supporting nothing — that is a closed question, and re-queuing it
 * would ask the same person the same thing forever.
 */
export function buildReviewQueue(
  candidates: QueueCandidate[],
  uncoveredRequirements: Array<{ severity: "critical" | "high" | "medium"; evidenceTags: string[] }>
): QueueItem[] {
  return candidates
    .filter((c) => !c.resolved.reviewed && c.resolved.types.length === 0)
    .map((c) => {
      // The hint has to come from a signal the classifier REJECTED, not one it
      // applies. A filename match is applied automatically, so a document
      // carrying one is never in this queue — using it as the hint made every
      // score zero and the ordering alphabetical.
      //
      // Content matches too weak to auto-apply are the real remaining clue.
      const hint = weakContentHints(c.text)[0] ?? null;

      // Counted against the filename hint, which is the only evidence we have
      // about what this document might be.
      //
      // The first version counted every uncovered requirement for every
      // document, which gave each item an identical score and collapsed the
      // ordering to alphabetical — defeating the entire point of the queue.
      // A document with no hint scores zero and sorts last, which is honest:
      // we cannot say what it would unblock, only that someone should look.
      const counts = { critical: 0, high: 0, medium: 0, total: 0 };
      if (hint) {
        for (const req of uncoveredRequirements) {
          if (!req.evidenceTags.includes(hint)) continue;
          counts[req.severity] += 1;
          counts.total += 1;
        }
      }

      return {
        evidenceId: c.evidenceId,
        fileName: baseName(c.sourcePath),
        reason: !c.hasText
          ? `no text layer · ${Math.round(c.extractionConfidence * 100)}% extraction`
          : `text present, no type matched · ${Math.round(c.extractionConfidence * 100)}% extraction`,
        unblocks: counts,
        suggestion: hint,
      };
    })
    .sort((a, b) => {
      const score = (i: QueueItem) =>
        i.unblocks.critical * SEVERITY_WEIGHT.critical +
        i.unblocks.high * SEVERITY_WEIGHT.high +
        i.unblocks.medium * SEVERITY_WEIGHT.medium;
      const diff = score(b) - score(a);
      // Stable, predictable tiebreak. Without it the list reshuffles between
      // loads and a reviewer loses their place mid-pass.
      return diff !== 0 ? diff : a.fileName.localeCompare(b.fileName);
    });
}
