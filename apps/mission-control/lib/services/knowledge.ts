import JSZip from "jszip";
import type { KnowledgeNoteInput, KnowledgeSearchResult } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import {
  defaultKnowledgePath,
  extractKnowledge,
  markdownForNote,
  parseFrontmatter,
  sensitivityFromFrontmatter,
  titleFromPath
} from "@/lib/knowledge/markdown";

export async function exportKnowledgeVault(workspaceId: string): Promise<Buffer> {
  const zip = new JSZip();
  const notes = await repository.listKnowledgeNotes(workspaceId, { limit: 500 });
  for (const note of notes) {
    zip.file(note.path, markdownForNote(note));
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

/**
 * Import caps. A zip is attacker-supplied input that expands server-side, so
 * the archive, each note, and the note count are all bounded rather than
 * trusting the uploaded file to be a real vault export.
 */
export const MAX_IMPORT_ARCHIVE_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_NOTE_BYTES = 1024 * 1024;
export const MAX_IMPORT_NOTES = 1000;

/**
 * Ceiling on the TOTAL uncompressed bytes an archive may expand to.
 *
 * The per-note and note-count caps alone allow 1000 x 1 MB = 1 GB of
 * decompression and database writes from one upload. Peak memory stays bounded
 * because entries are processed one at a time, so this is a throughput and cost
 * bound rather than an OOM guard — but a single request should not be able to
 * buy an hour of writes. See docs/PR_REVIEW_2026-08-08.md §6.4.
 */
export const MAX_IMPORT_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

/**
 * Size an entry claims it will expand to, read from the zip central directory
 * before any decompression. Compression ratios of 1000:1 are trivial to
 * produce, so an archive within MAX_IMPORT_ARCHIVE_BYTES says nothing about
 * what a single entry costs to inflate; the declared size does, and rejecting
 * on it keeps oversized entries from ever becoming resident.
 *
 * FRAGILE BY NECESSITY. `_data` is not part of JSZip's public API, so a JSZip
 * upgrade that renames or restructures it makes this return null and silently
 * disables the guard — the worst property a security control can have. Two
 * mitigations, both required:
 *
 *   1. package.json pins jszip to an exact version, not a caret range.
 *   2. tests/knowledge.test.ts asserts this returns a number for a real
 *      archive, so a dependency bump produces a red build rather than a
 *      quietly disabled check.
 *
 * Exported solely so that test can reach it.
 */
export function declaredUncompressedSize(entry: JSZip.JSZipObject): number | null {
  const data = (entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: unknown } })._data;
  return typeof data?.uncompressedSize === "number" ? data.uncompressedSize : null;
}

export async function importKnowledgeVault(
  workspaceId: string,
  actor: string,
  bytes: Buffer
): Promise<{ imported: number; skipped: number; notes: string[] }> {
  if (bytes.byteLength > MAX_IMPORT_ARCHIVE_BYTES) throw new Error("import_archive_too_large");
  const zip = await JSZip.loadAsync(bytes);
  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];
  let considered = 0;
  let totalUncompressed = 0;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.toLowerCase().endsWith(".md") || path.startsWith("__MACOSX/")) {
      skipped++;
      continue;
    }
    // Counted per candidate entry, not per successful import, so an archive of
    // entries that all fail validation cannot drive unbounded work.
    if (considered >= MAX_IMPORT_NOTES) {
      skipped++;
      continue;
    }
    considered++;
    const declared = declaredUncompressedSize(entry);
    if (declared !== null && declared > MAX_IMPORT_NOTE_BYTES) {
      skipped++;
      continue;
    }
    const markdown = await entry.async("string");
    const noteBytes = Buffer.byteLength(markdown, "utf8");
    if (noteBytes > MAX_IMPORT_NOTE_BYTES) {
      skipped++;
      continue;
    }
    // Aggregate ceiling. Counted on actual inflated size rather than the
    // declared one, so an archive that lies in its central directory still
    // hits the bound. Stop outright rather than skipping: past this point the
    // archive is not a plausible vault export.
    totalUncompressed += noteBytes;
    if (totalUncompressed > MAX_IMPORT_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("import_archive_expands_too_far");
    }
    const parsed = parseFrontmatter(markdown);
    const extracted = extractKnowledge(parsed.body, parsed.frontmatter);
    const input: KnowledgeNoteInput = {
      title: String(parsed.frontmatter.title ?? titleFromPath(path)),
      path,
      body: parsed.body,
      tags: extracted.tags,
      sensitivity: sensitivityFromFrontmatter(parsed.frontmatter.sensitivity),
      status: "active",
      sourceKind: "import",
      frontmatter: parsed.frontmatter,
      evidenceRefs: extracted.evidenceRefs,
      entityRefs: extracted.entityRefs,
      workflowRefs: extracted.workflowRefs,
      decisionRefs: extracted.decisionRefs,
      recommendationRefs: extracted.recommendationRefs
    };
    const note = await repository.upsertKnowledgeNote(workspaceId, input, actor);
    imported++;
    notes.push(note.id);
  }

  await repository.recordKnowledgeSyncEvent({
    workspaceId,
    type: "import",
    status: "success",
    message: `Imported ${imported} markdown note${imported === 1 ? "" : "s"}.`,
    path: null,
    noteId: null
  });

  return { imported, skipped, notes };
}

export async function triageKnowledgeInbox(workspaceId: string, actor: string) {
  const notes = await repository.listKnowledgeNotes(workspaceId, { limit: 500 });
  const inbox = notes.filter((note) => note.path.startsWith("_Inbox/"));
  const updated: string[] = [];

  for (const note of inbox) {
    const extracted = extractKnowledge(note.body, note.frontmatter);
    let nextPath = note.path;
    if (note.workflowRefs.length || extracted.workflowRefs.length) nextPath = `Workflows/${note.title}.md`;
    else if (note.entityRefs.length || extracted.entityRefs.length) nextPath = `Entities/${note.title}.md`;
    else if (note.evidenceRefs.length || extracted.evidenceRefs.length) nextPath = `Sources/${note.title}.md`;
    else if (note.tags.includes("project") || /project|pilot|roadmap/i.test(note.body)) nextPath = `Projects/${note.title}.md`;
    else if (/daily|today|standup|meeting/i.test(note.title + " " + note.body)) nextPath = `Daily/${note.title}.md`;

    if (nextPath !== note.path) {
      const next = await repository.upsertKnowledgeNote(
        workspaceId,
        {
          title: note.title,
          path: nextPath,
          body: note.body,
          tags: note.tags,
          sensitivity: note.sensitivity,
          status: note.status,
          sourceKind: "automation",
          frontmatter: note.frontmatter,
          evidenceRefs: note.evidenceRefs,
          entityRefs: note.entityRefs,
          workflowRefs: note.workflowRefs,
          decisionRefs: note.decisionRefs,
          recommendationRefs: note.recommendationRefs
        },
        actor,
        note.id
      );
      updated.push(next.id);
    }
  }

  return { triaged: updated.length, notes: updated };
}

export function newKnowledgeNoteTemplate(title = "Untitled"): KnowledgeNoteInput {
  return {
    title,
    path: defaultKnowledgePath(title),
    body: `# ${title}\n\n`,
    tags: [],
    sensitivity: "internal",
    status: "active",
    sourceKind: "manual",
    frontmatter: {},
    evidenceRefs: [],
    entityRefs: [],
    workflowRefs: [],
    decisionRefs: [],
    recommendationRefs: []
  };
}

export function summarizeSearchResults(results: KnowledgeSearchResult[]) {
  return results.map((result) => ({
    id: result.note.id,
    title: result.note.title,
    path: result.note.path,
    score: result.score,
    matchedFields: result.matchedFields,
    snippet: result.snippet
  }));
}
