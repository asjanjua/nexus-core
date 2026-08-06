/**
 * Daily Brief Generator
 *
 * Scans the Knowledge Workspace for activity in the last 24 hours and
 * produces a structured daily brief: new/changed notes, pending decisions,
 * tag shifts, new evidence refs, and orphan/stale warnings.
 *
 * Pure read-only analysis. No LLM calls. No mutations.
 */

import type { KnowledgeNote } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentNote {
  id: string;
  title: string;
  path: string;
  updatedAt: string;
  change: "new" | "updated";
  tags: string[];
  evidenceRefs: string[];
}

export interface DailyBrief {
  workspaceId: string;
  generatedAt: string;
  windowHours: number;
  totalNotes: number;
  /** Notes created or updated in the window. */
  recentNotes: RecentNote[];
  /** Notes linked to pending decisions (status = pending_approval, pending_review). */
  pendingDecisions: KnowledgeNote[];
  /** Notes with no tags or references — still unclassified. */
  untagged: KnowledgeNote[];
  /** Notes flagged as stale by the audit engine (> 90 days since update). */
  stale: KnowledgeNote[];
  /** Tags that appeared or were removed from notes in the window. */
  tagChanges: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WINDOW_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 90 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a daily brief from workspace notes. Pure function — caller
 * provides the notes array.
 */
export function generateDailyBrief(
  workspaceId: string,
  notes: KnowledgeNote[],
): DailyBrief {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const staleCutoff = now - STALE_MS;

  const active = notes.filter((n) => n.status !== "deleted" && n.status !== "archived");

  // Recent: created or updated in the last 24 hours.
  const recentNotes: RecentNote[] = [];
  const recentTags = new Set<string>();
  const recentIds = new Set<string>();

  for (const note of active) {
    const created = new Date(note.createdAt).getTime();
    const updated = new Date(note.updatedAt).getTime();

    if (created >= windowStart || updated >= windowStart) {
      recentNotes.push({
        id: note.id,
        title: note.title,
        path: note.path,
        updatedAt: note.updatedAt,
        change: created >= windowStart ? "new" : "updated",
        tags: note.tags,
        evidenceRefs: note.evidenceRefs,
      });
      recentIds.add(note.id);
      note.tags.forEach((t) => recentTags.add(t));
    }
  }

  // Pending decisions: notes that link to pending_approval/pending_review decisions.
  // We don't have the decision status in the note object itself — we check
  // the decisionRefs array. Notes reference decisions by ID. Without loading
  // decisions here (we're a pure function), we include ALL notes that have
  // at least one decisionRef — the caller can further filter if needed.
  const pendingDecisions = active.filter(
    (n) => n.decisionRefs.length > 0 && !recentIds.has(n.id),
  );

  // Untagged: notes with zero tags and no references — unclassified.
  const untagged = active.filter(
    (n) =>
      n.tags.length === 0 &&
      n.evidenceRefs.length === 0 &&
      n.entityRefs.length === 0 &&
      n.workflowRefs.length === 0 &&
      n.decisionRefs.length === 0 &&
      n.recommendationRefs.length === 0 &&
      !recentIds.has(n.id),
  );

  // Stale: not updated in > 90 days, excluding recent notes.
  const stale = active.filter(
    (n) =>
      new Date(n.updatedAt).getTime() < staleCutoff &&
      !recentIds.has(n.id),
  );

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    totalNotes: active.length,
    recentNotes: recentNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    pendingDecisions,
    untagged,
    stale,
    tagChanges: [...recentTags].sort(),
  };
}
