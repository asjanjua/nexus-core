import type { KnowledgeLinkType } from "@/lib/contracts";
import type { KnowledgeFilterOptions, KnowledgeFreshness } from "@/lib/knowledge/markdown";

const VALID_FRESHNESS = new Set<KnowledgeFreshness>(["24h", "7d", "30d", "all"]);
const VALID_REF_TYPES = new Set<KnowledgeLinkType | "any">([
  "any",
  "note",
  "evidence",
  "entity",
  "workflow_twin",
  "decision",
  "recommendation"
]);
const VALID_SOURCE_KINDS = new Set(["manual", "import", "sync", "automation", "mcp"]);

/**
 * Parses the shared filter query params used by both GET /api/knowledge/notes and
 * GET /api/knowledge/graph, so the two routes always agree on filter semantics
 * (the UI relies on this — the same filter state drives both the note list and the graph).
 */
export function parseKnowledgeFilterParams(searchParams: URLSearchParams): KnowledgeFilterOptions {
  const filters: KnowledgeFilterOptions = {};

  const tags = searchParams.get("tags");
  if (tags) {
    const parsed = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (parsed.length) filters.tags = parsed;
  }

  const sources = searchParams.get("sources");
  if (sources) {
    const parsed = sources.split(",").map((source) => source.trim()).filter((source) => VALID_SOURCE_KINDS.has(source));
    if (parsed.length) filters.sourceKinds = parsed;
  }

  const entityId = searchParams.get("entityId");
  if (entityId) filters.entityId = entityId;

  const workflowId = searchParams.get("workflowId");
  if (workflowId) filters.workflowId = workflowId;

  const refType = searchParams.get("refType");
  if (refType && VALID_REF_TYPES.has(refType as KnowledgeLinkType | "any")) {
    filters.refType = refType as KnowledgeLinkType | "any";
  }

  const freshness = searchParams.get("freshness");
  if (freshness && VALID_FRESHNESS.has(freshness as KnowledgeFreshness)) {
    filters.freshness = freshness as KnowledgeFreshness;
  }

  return filters;
}
