import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import type { KnowledgeSearchResult } from "@/lib/contracts";
import { summarizeSearchResults } from "@/lib/services/knowledge";
import { generateEmbedding, isVectorSearchEnabled } from "@/lib/services/embeddings";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

  let results: KnowledgeSearchResult[] = [];

  // Try vector search first for semantic matching
  if (q && isVectorSearchEnabled()) {
    const embedding = await generateEmbedding(q);
    if (embedding) {
      const vectorNotes = await repository.searchKnowledgeVector(ctx.workspaceId, embedding, limit);
      results = vectorNotes.map((note) => ({
        note,
        score: 50,
        matchedFields: ["title", "body"],
        snippet: note.body.slice(0, 220),
      }));
    }
  }

  // Fall back to text search if no vector results
  if (!results.length) {
    results = await repository.searchKnowledge(ctx.workspaceId, q, limit);
  }

  return ok({ results, summary: summarizeSearchResults(results), total: results.length });
}
