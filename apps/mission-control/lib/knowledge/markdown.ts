import type {
  KnowledgeGraph,
  KnowledgeLink,
  KnowledgeLinkType,
  KnowledgeNote,
  KnowledgeSearchResult,
  Sensitivity
} from "@/lib/contracts";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;
const TAG_RE = /(^|\s)#([a-zA-Z0-9_/-]{2,80})\b/g;
const HEADING_RE = /^#{1,6}\s+(.+)$/gm;
const TYPED_REF_RE = /\b(evidence|entity|workflow|decision|recommendation):([a-zA-Z0-9_:.#/-]+)\b/g;

export type ParsedMarkdown = {
  body: string;
  frontmatter: Record<string, unknown>;
};

export type ExtractedKnowledge = {
  tags: string[];
  wikilinks: string[];
  headings: string[];
  evidenceRefs: string[];
  entityRefs: string[];
  workflowRefs: string[];
  decisionRefs: string[];
  recommendationRefs: string[];
};

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

export function defaultKnowledgePath(title: string): string {
  return `_Inbox/${slugifyTitle(title)}.md`;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return { body: markdown, frontmatter: {} };
  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    frontmatter[key] = parseScalar(value);
  }
  return { body: markdown.slice(match[0].length), frontmatter };
}

function formatScalar(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(", ")}]`;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(String(value ?? ""));
}

export function serializeFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${formatScalar(value)}`);
  if (!lines.length) return body;
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

export function frontmatterForNote(note: KnowledgeNote): Record<string, unknown> {
  return {
    ...note.frontmatter,
    nexus_id: note.id,
    workspace_id: note.workspaceId,
    title: note.title,
    tags: note.tags,
    sensitivity: note.sensitivity,
    evidence_refs: note.evidenceRefs,
    entity_refs: note.entityRefs,
    workflow_refs: note.workflowRefs,
    decision_refs: note.decisionRefs,
    recommendation_refs: note.recommendationRefs,
    created_at: note.createdAt,
    updated_at: note.updatedAt
  };
}

export function markdownForNote(note: KnowledgeNote): string {
  return serializeFrontmatter(frontmatterForNote(note), note.body);
}

export function extractKnowledge(markdown: string, frontmatter: Record<string, unknown> = {}): ExtractedKnowledge {
  const tags = new Set<string>();
  const wikilinks: string[] = [];
  const headings: string[] = [];
  const refs: Record<"evidence" | "entity" | "workflow" | "decision" | "recommendation", string[]> = {
    evidence: [],
    entity: [],
    workflow: [],
    decision: [],
    recommendation: []
  };

  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(markdown))) wikilinks.push(match[1].split("|")[0].trim());
  while ((match = TAG_RE.exec(markdown))) tags.add(match[2].trim());
  while ((match = HEADING_RE.exec(markdown))) headings.push(match[1].trim());
  while ((match = TYPED_REF_RE.exec(markdown))) refs[match[1] as keyof typeof refs].push(match[2]);

  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) fmTags.forEach((tag) => tags.add(String(tag).replace(/^#/, "")));

  function fmRefs(key: string): string[] {
    const value = frontmatter[key];
    return Array.isArray(value) ? value.map(String) : [];
  }

  return {
    tags: uniq(Array.from(tags)),
    wikilinks: uniq(wikilinks),
    headings: uniq(headings),
    evidenceRefs: uniq([...refs.evidence, ...fmRefs("evidence_refs")]),
    entityRefs: uniq([...refs.entity, ...fmRefs("entity_refs")]),
    workflowRefs: uniq([...refs.workflow, ...fmRefs("workflow_refs")]),
    decisionRefs: uniq([...refs.decision, ...fmRefs("decision_refs")]),
    recommendationRefs: uniq([...refs.recommendation, ...fmRefs("recommendation_refs")])
  };
}

export function titleFromPath(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

export function sensitivityFromFrontmatter(value: unknown): Sensitivity {
  return value === "public" || value === "internal" || value === "confidential" || value === "restricted"
    ? value
    : "internal";
}

function fieldScore(query: string, value: string, weight: number): number {
  if (!value) return 0;
  const hay = value.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const matched = terms.filter((term) => hay.includes(term)).length;
  return (matched / terms.length) * weight;
}

function snippetFor(note: KnowledgeNote, query: string): string {
  const body = note.body.replace(/\s+/g, " ").trim();
  if (!body) return "";
  const term = query.toLowerCase().split(/\s+/).find(Boolean);
  const idx = term ? body.toLowerCase().indexOf(term) : -1;
  const start = idx > 50 ? idx - 50 : 0;
  return body.slice(start, start + 220);
}

export function searchKnowledgeNotes(notes: KnowledgeNote[], query: string, limit = 20): KnowledgeSearchResult[] {
  const q = query.trim();
  if (!q) {
    return notes
      .filter((note) => note.status === "active")
      .slice(0, limit)
      .map((note) => ({ note, score: 1, matchedFields: ["recent"], snippet: snippetFor(note, "") }));
  }
  return notes
    .filter((note) => note.status === "active")
    .map((note) => {
      const extracted = extractKnowledge(note.body, note.frontmatter);
      const scores = [
        ["title", fieldScore(q, note.title, 5)] as const,
        ["path", fieldScore(q, note.path, 3)] as const,
        ["tags", fieldScore(q, note.tags.join(" "), 4)] as const,
        ["headings", fieldScore(q, extracted.headings.join(" "), 3)] as const,
        ["links", fieldScore(q, extracted.wikilinks.join(" "), 2)] as const,
        ["body", fieldScore(q, note.body, 1)] as const
      ];
      const score = scores.reduce((sum, [, value]) => sum + value, 0);
      return {
        note,
        score,
        matchedFields: scores.filter(([, value]) => value > 0).map(([field]) => field),
        snippet: snippetFor(note, q)
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.note.updatedAt.localeCompare(a.note.updatedAt))
    .slice(0, limit);
}

export function buildKnowledgeLinks(note: KnowledgeNote): Omit<KnowledgeLink, "id" | "workspaceId" | "sourceNoteId" | "createdAt">[] {
  const extracted = extractKnowledge(note.body, note.frontmatter);
  const links: Omit<KnowledgeLink, "id" | "workspaceId" | "sourceNoteId" | "createdAt">[] = [];
  for (const label of extracted.wikilinks) {
    links.push({ targetType: "note", targetId: slugifyTitle(label), label });
  }
  const typed: Array<[KnowledgeLinkType, string[]]> = [
    ["evidence", note.evidenceRefs],
    ["entity", note.entityRefs],
    ["workflow_twin", note.workflowRefs],
    ["decision", note.decisionRefs],
    ["recommendation", note.recommendationRefs]
  ];
  for (const [targetType, ids] of typed) {
    for (const id of ids) links.push({ targetType, targetId: id, label: id });
  }
  return links;
}

export function buildKnowledgeGraph(notes: KnowledgeNote[], links: KnowledgeLink[]): KnowledgeGraph {
  const nodes = new Map<string, { id: string; label: string; type: string }>();
  const edges: KnowledgeGraph["edges"] = [];
  for (const note of notes) {
    nodes.set(`note:${note.id}`, { id: `note:${note.id}`, label: note.title, type: "note" });
  }
  for (const link of links) {
    const targetId = `${link.targetType}:${link.targetId}`;
    if (!nodes.has(targetId)) nodes.set(targetId, { id: targetId, label: link.label, type: link.targetType });
    edges.push({
      id: link.id,
      source: `note:${link.sourceNoteId}`,
      target: targetId,
      type: link.targetType,
      label: link.label
    });
  }
  return { nodes: Array.from(nodes.values()), edges };
}
