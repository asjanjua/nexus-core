/**
 * Knowledge Workspace Audit Engine
 *
 * Scans a workspace's knowledge notes for three classes of integrity issues:
 *
 * 1. DUPLICATES — notes whose titles are near-identical (Levenshtein ≤ 3)
 *    or that share ≥ 2 evidence references with another note. These suggest
 *    the same claim was recorded twice, potentially with divergent wording.
 *
 * 2. CONTRADICTIONS — notes tagged with semantically opposed labels (e.g.
 *    "risk-high" vs "risk-low") that reference the same entity. Also checks
 *    for notes that reference the same evidence but appear to draw opposite
 *    conclusions based on body keyword analysis.
 *
 * 3. STALENESS — notes not updated in > 90 days. Notes whose evidenceRefs
 *    reference records that no longer exist (broken evidence links). Notes
 *    that have no tags, no refs, and no body content (orphan drafts).
 *
 * All checks are workspace-scoped and read-only. The engine returns an
 * AuditReport that can be rendered by a UI panel or consumed by an API.
 *
 * No LLM calls. No mutations. This is a deterministic structural audit.
 */

import type { KnowledgeNote } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateGroup {
  /** Human-readable reason this group was flagged. */
  reason: string;
  /** The notes in this duplicate group. */
  notes: KnowledgeNote[];
}

export interface ContradictionPair {
  /** Human-readable description of the contradiction. */
  reason: string;
  /** The two notes that appear to contradict. */
  noteA: KnowledgeNote;
  noteB: KnowledgeNote;
}

export interface StaleItem {
  /** Human-readable staleness reason. */
  reason: string;
  /** The stale note. */
  note: KnowledgeNote;
}

export interface AuditReport {
  workspaceId: string;
  generatedAt: string;
  totalNotes: number;
  duplicates: DuplicateGroup[];
  contradictions: ContradictionPair[];
  stale: StaleItem[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STALE_DAYS = 90;
const MIN_SHARED_REFS = 2;
const MAX_TITLE_EDIT_DISTANCE = 3;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Run the full audit against a workspace's knowledge notes.
 * Pure function — no database calls, no side effects.
 */
export function auditKnowledgeWorkspace(
  workspaceId: string,
  notes: KnowledgeNote[],
): AuditReport {
  const active = notes.filter((n) => n.status !== "deleted" && n.status !== "archived");

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    totalNotes: active.length,
    duplicates: findDuplicates(active),
    contradictions: findContradictions(active),
    stale: findStaleItems(active),
  };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function findDuplicates(notes: KnowledgeNote[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < notes.length; i++) {
    if (seen.has(notes[i].id)) continue;
    const cluster: KnowledgeNote[] = [notes[i]];

    for (let j = i + 1; j < notes.length; j++) {
      if (seen.has(notes[j].id)) continue;

      // Title similarity: Levenshtein distance ≤ N chars apart.
      const titleClose =
        levenshtein(
          notes[i].title.toLowerCase(),
          notes[j].title.toLowerCase(),
        ) <= MAX_TITLE_EDIT_DISTANCE;

      // Evidence overlap: share at least N evidence refs.
      const shared = intersection(notes[i].evidenceRefs, notes[j].evidenceRefs);

      if (titleClose || shared.length >= MIN_SHARED_REFS) {
        cluster.push(notes[j]);
        seen.add(notes[j].id);
      }
    }

    if (cluster.length > 1) {
      seen.add(notes[i].id);
      // Determine if the grouping was due to title similarity or evidence overlap.
      const titleReason = cluster.slice(1).some((n) =>
        levenshtein(notes[i].title.toLowerCase(), n.title.toLowerCase()) <= MAX_TITLE_EDIT_DISTANCE,
      );
      const evReason = cluster.some((n) =>
        intersection(n.evidenceRefs, cluster[0].evidenceRefs).length >= MIN_SHARED_REFS,
      );
      groups.push({
        reason: titleReason
          ? `Near-identical titles: "${cluster[0].title}" and "${cluster[1].title}"`
          : evReason
            ? `Share ${MIN_SHARED_REFS}+ evidence references`
            : `Similar titles (${cluster.length} notes)`,
        notes: cluster,
      });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Contradiction detection
// ---------------------------------------------------------------------------

/** Tags that suggest opposing assessments. */
const OPPOSING_TAG_PAIRS: Array<[string, string]> = [
  ["risk-high", "risk-low"],
  ["risk-high", "risk-none"],
  ["confidence-high", "confidence-low"],
  ["approved", "rejected"],
  ["verified", "disputed"],
  ["compliant", "non-compliant"],
];

/** Keywords that suggest an issue is present vs. absent. */
const CONTRADICTING_KEYWORDS: Array<[string[], string[]]> = [
  [["material", "significant", "substantial"], ["immaterial", "insignificant", "negligible"]],
  [["compliant", "conforming", "adherent"], ["non-compliant", "violation", "breach"]],
  [["approved", "accepted", "cleared"], ["rejected", "denied", "refused"]],
  [["exists", "present", "confirmed"], ["absent", "missing", "not found"]],
];

function findContradictions(notes: KnowledgeNote[]): ContradictionPair[] {
  const pairs: ContradictionPair[] = [];

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const a = notes[i];
      const b = notes[j];

      // 1. Opposing tags on the same entity.
      const sharedEntities = intersection(a.entityRefs, b.entityRefs);
      if (sharedEntities.length > 0) {
        for (const [neg, pos] of OPPOSING_TAG_PAIRS) {
          if (
            (a.tags.includes(neg) && b.tags.includes(pos)) ||
            (a.tags.includes(pos) && b.tags.includes(neg))
          ) {
            pairs.push({
              reason: `Opposing tags on entity "${sharedEntities[0]}": "${neg}" vs "${pos}"`,
              noteA: a,
              noteB: b,
            });
            break; // One contradiction per pair is enough
          }
        }
      }

      // 2. Same evidence refs, opposing body keywords.
      const sharedEvidence = intersection(a.evidenceRefs, b.evidenceRefs);
      if (sharedEvidence.length > 0) {
        const bodyA = a.body.toLowerCase();
        const bodyB = b.body.toLowerCase();
        for (const [presentKw, absentKw] of CONTRADICTING_KEYWORDS) {
          const aPresent = presentKw.some((kw) => bodyA.includes(kw));
          const aAbsent = absentKw.some((kw) => bodyA.includes(kw));
          const bPresent = presentKw.some((kw) => bodyB.includes(kw));
          const bAbsent = absentKw.some((kw) => bodyB.includes(kw));
          if ((aPresent && bAbsent) || (aAbsent && bPresent)) {
            pairs.push({
              reason: `Opposing conclusions from the same evidence "${sharedEvidence[0]}": "${presentKw[0]}" vs "${absentKw[0]}"`,
              noteA: a,
              noteB: b,
            });
            break;
          }
        }
      }
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Staleness detection
// ---------------------------------------------------------------------------

function findStaleItems(notes: KnowledgeNote[]): StaleItem[] {
  const stale: StaleItem[] = [];
  const cutoff = Date.now() - STALE_DAYS * 86_400_000;

  for (const note of notes) {
    // Age-based staleness.
    const updatedAt = new Date(note.updatedAt).getTime();
    if (updatedAt < cutoff) {
      const days = Math.floor((Date.now() - updatedAt) / 86_400_000);
      stale.push({
        reason: `Not updated in ${days} days (threshold: ${STALE_DAYS})`,
        note,
      });
      continue; // Don't double-flag the same note
    }

    // Orphan draft: no tags, no refs, minimal body.
    // Checks all five ref arrays — a note that only has decision refs
    // should not be classified as an orphan. Reviewed 2026-08-06:
    // decisionRefs and recommendationRefs were previously excluded.
    if (
      note.tags.length === 0 &&
      note.evidenceRefs.length === 0 &&
      note.entityRefs.length === 0 &&
      note.workflowRefs.length === 0 &&
      note.decisionRefs.length === 0 &&
      note.recommendationRefs.length === 0 &&
      note.body.length < 50
    ) {
      stale.push({
        reason: "Orphan draft — no tags, references, or substantive content",
        note,
      });
    }
  }

  return stale;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
