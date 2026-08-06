import { describe, expect, it } from "vitest";
import { selectQueueAdditions } from "@/lib/ingestion-queue";

/**
 * The upload queue's two guards: de-duplication and the ten-file batch cap.
 *
 * Both were silently dead on the drag-and-drop path. `handleDrop` was
 * `useCallback(..., [])` and captured a `pickFiles` closed over the first
 * render's `files`, which is always `[]`. So every drop de-duplicated against
 * an empty list and computed `MAX_FILES - 0` as the remaining space.
 *
 * Nothing looked broken. The queue is appended with the functional setState
 * form, so files still accumulated correctly — only the guards were inert. And
 * the file-picker path used an inline arrow, recreated each render, so it was
 * always correct. One path worked, one did not.
 *
 * These tests exist because "drop the same file twice and look carefully" is
 * not a regression test. See docs/ENGINEERING_GUARDRAILS.md §10.1.
 */

const f = (name: string, size = 100, lastModified = 1) => ({ name, size, lastModified });

describe("selectQueueAdditions", () => {
  it("accepts new files into an empty queue", () => {
    const r = selectQueueAdditions([], [f("a.pdf"), f("b.pdf")]);
    expect(r.selected.map((x) => x.name)).toEqual(["a.pdf", "b.pdf"]);
    expect(r.overflowed).toBe(false);
  });

  it("rejects a file already in the queue", () => {
    // The bug: this compared against an empty list on every drop, so the same
    // document could be queued and ingested repeatedly.
    const r = selectQueueAdditions([f("a.pdf")], [f("a.pdf"), f("b.pdf")]);
    expect(r.selected.map((x) => x.name)).toEqual(["b.pdf"]);
  });

  it("rejects duplicates within a single drop", () => {
    const r = selectQueueAdditions([], [f("a.pdf"), f("a.pdf")]);
    expect(r.selected).toHaveLength(1);
  });

  it("treats same-named files as different when size or date differ", () => {
    // "Annex 4.pdf" is not a unique identifier in any real data room.
    const r = selectQueueAdditions(
      [f("Annex 4.pdf", 100, 1)],
      [f("Annex 4.pdf", 200, 1), f("Annex 4.pdf", 100, 2)]
    );
    expect(r.selected).toHaveLength(2);
  });

  it("enforces the cap against the EXISTING queue, not just this drop", () => {
    // The precise failure. Nine already queued plus three dropped must admit
    // one, not three. The stale closure saw zero queued and admitted all three.
    const existing = Array.from({ length: 9 }, (_, i) => f(`old${i}.pdf`));
    const r = selectQueueAdditions(existing, [f("x.pdf"), f("y.pdf"), f("z.pdf")]);
    expect(r.selected).toHaveLength(1);
    expect(r.overflowed).toBe(true);
  });

  it("admits nothing once the queue is full", () => {
    const existing = Array.from({ length: 10 }, (_, i) => f(`old${i}.pdf`));
    const r = selectQueueAdditions(existing, [f("x.pdf")]);
    expect(r.selected).toEqual([]);
    expect(r.overflowed).toBe(true);
  });

  it("does not report overflow when the drop lands exactly on the cap", () => {
    // Ten into an empty queue is at the limit, not over it. Warning here would
    // train people to ignore the warning.
    const r = selectQueueAdditions([], Array.from({ length: 10 }, (_, i) => f(`n${i}.pdf`)));
    expect(r.selected).toHaveLength(10);
    expect(r.overflowed).toBe(false);
  });

  it("does not report overflow when only duplicates were turned away", () => {
    // A duplicate is not a capacity problem, and saying "you can queue up to
    // 10 files" would be a misleading explanation of what just happened.
    const r = selectQueueAdditions([f("a.pdf")], [f("a.pdf")]);
    expect(r.selected).toEqual([]);
    expect(r.overflowed).toBe(false);
  });

  it("never mutates the caller's queue", () => {
    const existing = [f("a.pdf")];
    selectQueueAdditions(existing, [f("b.pdf")]);
    expect(existing).toHaveLength(1);
  });
});
