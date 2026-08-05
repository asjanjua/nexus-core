import { describe, expect, it } from "vitest";
import { buildReviewQueue, type QueueCandidate } from "@/lib/evidence-review-queue";
import { resolveDocumentTypes } from "@/lib/domain/document-type-classifier";

/**
 * The queue's whole value is the ORDER. Thirty unidentified documents is a wall
 * a reviewer bounces off; "this one unblocks three critical requirements" is a
 * next action.
 *
 * The first implementation counted every uncovered requirement for every
 * document, which gave each item an identical score and silently collapsed the
 * ordering to alphabetical. It looked like a prioritised queue and was not.
 * These tests exist mostly to stop that returning.
 */

function candidate(
  path: string,
  opts: { text?: string; confidence?: number; override?: { types: string[]; setBy: string } } = {}
): QueueCandidate {
  const text = opts.text ?? "";
  return {
    evidenceId: `ev-${path}`,
    sourcePath: path,
    extractionConfidence: opts.confidence ?? 0.4,
    hasText: text.length > 0,
    text,
    resolved: resolveDocumentTypes({ sourcePath: path, text }, opts.override ?? null),
  };
}

/**
 * A single passing mention, placed PAST the 300-character title region and
 * appearing once, so it clears neither bar in contentTypes.
 *
 * That gap is the only reason a document can be both unidentified and
 * rankable. Put the same phrase near the top and the classifier types it
 * outright, and it leaves the queue entirely — which is exactly what happened
 * to the first version of these fixtures.
 */
const mention = (type: string) =>
  `${"General narrative about the transaction background. ".repeat(8)} See the ${type.toLowerCase()} appended separately.`;

const REQS = [
  { severity: "critical" as const, evidenceTags: ["Cap Table"] },
  { severity: "critical" as const, evidenceTags: ["Cap Table"] },
  { severity: "high" as const, evidenceTags: ["Business Plan"] },
  { severity: "medium" as const, evidenceTags: ["Org Chart"] },
];

describe("buildReviewQueue", () => {
  it("only queues documents nobody has typed", () => {
    const queue = buildReviewQueue(
      [
        candidate("/d/Project Falcon - Annex 4.pdf"),
        candidate("/d/AML Policy.pdf"), // classifier already typed it
      ],
      REQS
    );
    expect(queue.map((i) => i.fileName)).toEqual(["Project Falcon - Annex 4.pdf"]);
  });

  it("does not re-queue a document a reviewer already ruled unusable", () => {
    // "Supports nothing" is a closed question. Re-queuing it would ask the
    // same person the same thing forever.
    const queue = buildReviewQueue(
      [candidate("/d/scan_1.pdf", { override: { types: [], setBy: "u1" } })],
      REQS
    );
    expect(queue).toHaveLength(0);
  });

  it("orders by what each document would unblock, not alphabetically", () => {
    // "zzz" mentions a cap table, worth two critical requirements; "aaa"
    // mentions an org chart, worth one medium. Alphabetical would invert this.
    const queue = buildReviewQueue(
      [
        candidate("/d/aaa annex.pdf", { text: mention("org chart") }),
        candidate("/d/zzz annex.pdf", { text: mention("cap table") }),
      ],
      REQS
    );
    expect(queue.map((i) => i.fileName)).toEqual(["zzz annex.pdf", "aaa annex.pdf"]);
    expect(queue[0].unblocks.critical).toBe(2);
    expect(queue[1].unblocks.medium).toBe(1);
  });

  it("weights one critical above any number of mediums", () => {
    const manyMedium = Array.from({ length: 20 }, () => ({
      severity: "medium" as const,
      evidenceTags: ["Org Chart"],
    }));
    const queue = buildReviewQueue(
      [
        candidate("/d/a annex.pdf", { text: mention("org chart") }),
        candidate("/d/b annex.pdf", { text: mention("cap table") }),
      ],
      [...manyMedium, { severity: "critical" as const, evidenceTags: ["Cap Table"] }]
    );
    expect(queue[0].fileName).toBe("b annex.pdf");
  });

  it("scores a document with no hint at zero and sorts it last", () => {
    // Honest: we cannot say what an unnameable scan would unblock, only that
    // somebody should open it.
    const queue = buildReviewQueue(
      [
        candidate("/d/scan_00412.pdf"),
        candidate("/d/annex.pdf", { text: mention("cap table") }),
      ],
      REQS
    );
    expect(queue[queue.length - 1].fileName).toBe("scan_00412.pdf");
    expect(queue[queue.length - 1].unblocks.total).toBe(0);
    expect(queue[queue.length - 1].suggestion).toBeNull();
  });

  it("breaks ties by name so the list does not reshuffle between loads", () => {
    // A reviewer working down the list loses their place if equal-scoring
    // items reorder on every fetch.
    const queue = buildReviewQueue(
      [candidate("/d/b_scan.pdf"), candidate("/d/a_scan.pdf"), candidate("/d/c_scan.pdf")],
      REQS
    );
    expect(queue.map((i) => i.fileName)).toEqual(["a_scan.pdf", "b_scan.pdf", "c_scan.pdf"]);
  });

  it("distinguishes a scan from a document that simply did not match", () => {
    // Different problems needing different fixes: one needs OCR, the other
    // needs a human to name it.
    const [scan] = buildReviewQueue([candidate("/d/scan_1.pdf", { confidence: 0.33 })], REQS);
    const [textual] = buildReviewQueue(
      [candidate("/d/FINAL_v3.docx", { text: "Some prose with no recognisable type.", confidence: 0.88 })],
      REQS
    );
    expect(scan.reason).toContain("no text layer");
    expect(scan.reason).toContain("33%");
    expect(textual.reason).toContain("text present");
    expect(textual.reason).toContain("88%");
  });

  it("offers a filename hint without applying it", () => {
    // The suggestion is a shortcut for a human, never a decision. The document
    // is still in the queue precisely because nothing has been applied.
    const [item] = buildReviewQueue(
      [candidate("/d/annex.pdf", { text: mention("cap table") })],
      REQS
    );
    expect(item.suggestion).toBe("Cap Table");
    expect(item.unblocks.critical).toBe(2);
    // Still queued: a suggestion is not an application.
    expect(item.fileName).toBe("annex.pdf");
  });
});
