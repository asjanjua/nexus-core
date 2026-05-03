/**
 * Embedding generation for semantic retrieval.
 *
 * Model: OpenAI text-embedding-3-small (1536-dim).
 * Cheap, fast, and the de facto standard pairing for pgvector HNSW indexes.
 * Anthropic does not expose an embeddings endpoint, so OpenAI is used as a
 * separate inference provider while Claude handles synthesis.
 *
 * Feature flag: NEXUS_VECTOR_SEARCH=enabled
 *   - When off (default): all functions return null / false without making
 *     any network call. Keyword search continues as before.
 *   - When on: OPENAI_API_KEY must also be set or calls silently return null.
 *
 * The caller (ingestion, retrieval) must handle null gracefully — vector
 * search is always additive, never blocking.
 */

const EMBED_API = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small"; // 1536-dim output
const MAX_INPUT_CHARS = 8_000; // ~6k tokens, well within the 8k token limit

export function isVectorSearchEnabled(): boolean {
  return process.env.NEXUS_VECTOR_SEARCH === "enabled";
}

/**
 * Generate a 1536-dim embedding for the given text.
 * Returns null when the feature flag is off, the API key is missing,
 * or the upstream call fails. Never throws.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!isVectorSearchEnabled()) return null;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  // Truncate to avoid token limit errors on large documents.
  const input = text.slice(0, MAX_INPUT_CHARS);

  try {
    const res = await fetch(EMBED_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: EMBED_MODEL, input })
    });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return json.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Cosine similarity between two equal-length vectors.
 * Used in the in-memory store path when vector search is enabled but
 * no database is available (dev / demo mode).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
