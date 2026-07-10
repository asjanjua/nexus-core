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

export async function importKnowledgeVault(
  workspaceId: string,
  actor: string,
  bytes: Buffer
): Promise<{ imported: number; skipped: number; notes: string[] }> {
  const zip = await JSZip.loadAsync(bytes);
  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.toLowerCase().endsWith(".md") || path.startsWith("__MACOSX/")) {
      skipped++;
      continue;
    }
    const markdown = await entry.async("string");
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
