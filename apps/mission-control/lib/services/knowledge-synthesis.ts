/**
 * Knowledge Workspace Synthesis — the last planned Nexus native skill.
 *
 * Takes governed knowledge notes, graph references (entity links),
 * and evidence records for a workspace, then produces:
 *   1. Workspace brief — structured executive summary
 *   2. Linked evidence map — note→evidence provenance
 *   3. Theme summary — top 3-5 themes across notes
 *   4. Follow-up questions — gaps and next steps
 *
 * Not approval-gated (analyze family). Runs on demand from /knowledge.
 */

import type { KnowledgeNote } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceSynthesisInput {
  workspaceId: string;
  notes: KnowledgeNote[];
  graphRefs: { sourceId: string; targetId: string; label: string }[];
  evidenceCount: number;
}

export interface WorkspaceSynthesisOutput {
  generatedAt: string;
  workspaceId: string;
  totalNotes: number;
  totalLinks: number;
  evidenceCount: number;
  brief: string;
  linkedEvidenceMap: { noteId: string; evidenceRefs: string[]; title: string }[];
  themeSummary: string[];
  followUpQuestions: string[];
}

// ---------------------------------------------------------------------------
// Synthesis engine — deterministic, no LLM call.
// The "analyze" family skills are structural, not generative.
// This produces a structured digest that the front-end renders.
// ---------------------------------------------------------------------------

export function generateWorkspaceSynthesis(
  input: WorkspaceSynthesisInput,
): WorkspaceSynthesisOutput {
  const { workspaceId, notes, graphRefs, evidenceCount } = input;

  // 1. Linked evidence map — for each note, find evidence references
  const linkedEvidenceMap = notes.map((note) => {
    const refs = graphRefs
      .filter((g) => g.sourceId === note.id && g.label === "references")
      .map((g) => g.targetId);
    return {
      noteId: note.id,
      evidenceRefs: Array.from(new Set(refs)),
      title: note.title ?? note.id,
    };
  });

  // 2. Theme extraction — count tags across all notes
  const tagCounts = new Map<string, number>();
  for (const note of notes) {
    const tags = note.tags ?? [];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const themeSummary = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // 3. Brief — structured summary based on note statuses and categories
  const activeNotes = notes.filter((n) => n.status === "active");
  const archivedNotes = notes.filter((n) => n.status === "archived");
  const withEvidence = linkedEvidenceMap.filter((m) => m.evidenceRefs.length > 0).length;
  const withoutEvidence = linkedEvidenceMap.filter((m) => m.evidenceRefs.length === 0).length;

  const noteCategories = new Map<string, number>();
  for (const note of notes) {
    const cat = note.sourceKind ?? "manual";
    noteCategories.set(cat, (noteCategories.get(cat) ?? 0) + 1);
  }
  const topCategories = Array.from(noteCategories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count})`);

  const brief = [
    `Workspace synthesis: ${notes.length} notes across ${topCategories.join(", ")}.`,
    `${activeNotes.length} active, ${archivedNotes.length} archived.`,
    `${withEvidence} of ${notes.length} notes have linked evidence; ${withoutEvidence} are reference-free.`,
    evidenceCount > 0
      ? `${evidenceCount} total evidence records ingested.`
      : "No evidence records ingested yet.",
    themeSummary.length > 0
      ? `Top themes: ${themeSummary.join(", ")}.`
      : "No themes detected (notes without tags).",
  ].join(" ");

  // 4. Follow-up questions — structural gaps
  const followUpQuestions: string[] = [];
  if (withoutEvidence > 0) {
    followUpQuestions.push(
      `${withoutEvidence} notes have no linked evidence. Upload supporting documents to strengthen provenance.`,
    );
  }
  if (notes.filter((n) => n.status === "active" && !n.tags?.length).length > 0) {
    followUpQuestions.push(
      "Some active notes have no tags. Tagging improves theme detection and cross-workspace retrieval.",
    );
  }
  if (archivedNotes.length > notes.length * 0.5) {
    followUpQuestions.push(
      "More than half of your notes are archived. Consider reviewing or deleting stale content.",
    );
  }
  if (evidenceCount === 0) {
    followUpQuestions.push(
      "No evidence has been ingested. Upload documents to enable evidence-backed synthesis.",
    );
  }
  if (followUpQuestions.length === 0) {
    followUpQuestions.push("Your knowledge workspace is well-organized. No immediate actions needed.");
  }

  return {
    generatedAt: new Date().toISOString(),
    workspaceId,
    totalNotes: notes.length,
    totalLinks: graphRefs.length,
    evidenceCount,
    brief,
    linkedEvidenceMap,
    themeSummary,
    followUpQuestions,
  };
}
