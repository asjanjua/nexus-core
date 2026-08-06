/**
 * Upload queue admission rules.
 *
 * Pure, and in lib/ rather than beside the component, so the two guards below
 * can be tested without rendering. They were silently dead on the
 * drag-and-drop path for exactly as long as they were untestable.
 * See docs/ENGINEERING_GUARDRAILS.md §10.1.
 */

/** Maximum files per upload batch. */
export const MAX_FILES = 10;

/** Identity of a queued file. Name alone is not enough — two different reports
 *  are routinely both called "Annex 4.pdf". */
type QueuedFile = { name: string; size: number; lastModified: number };

const fileKey = (f: QueuedFile) => `${f.name}:${f.size}:${f.lastModified}`;

/**
 * Which of the incoming files should join the queue.
 *
 * EXTRACTED SO IT CAN BE TESTED. Both guards below — de-duplication and the
 * batch cap — were silently dead on the drag-and-drop path because the drop
 * handler was memoised with an empty dependency array and captured
 * `files === []` from the first render forever. The visible behaviour stayed
 * correct, because the queue itself is appended with the functional setState
 * form, so nothing looked wrong while both guards did nothing.
 *
 * A pure function over the CURRENT queue makes that class of failure testable
 * instead of only observable by dropping the same file twice and noticing.
 * See docs/ENGINEERING_GUARDRAILS.md §10.1.
 */
export function selectQueueAdditions<T extends QueuedFile>(
  existing: T[],
  incoming: T[],
  max = MAX_FILES
): { selected: T[]; overflowed: boolean } {
  const seen = new Set(existing.map(fileKey));
  const additions = incoming.filter((file) => {
    const key = fileKey(file);
    // Guards against duplicates WITHIN one drop as well as against the queue.
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const available = Math.max(0, max - existing.length);
  return {
    selected: additions.slice(0, available),
    // Only overflow if something was actually turned away. Dropping ten files
    // into an empty queue is exactly at the cap, not over it.
    overflowed: additions.length > available,
  };
}
