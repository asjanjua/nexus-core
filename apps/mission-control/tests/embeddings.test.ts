import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cosineSimilarity, generateEmbedding, isVectorSearchEnabled } from "@/lib/services/embeddings";

const originalEnv = { ...process.env };
const fetchMock = vi.fn();

function enableVectorSearch() {
  process.env.NEXUS_VECTOR_SEARCH = "enabled";
  process.env.OPENAI_API_KEY = "sk-test";
}

function embeddingResponse(embedding: number[]) {
  return { ok: true, json: async () => ({ data: [{ embedding }] }) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  delete process.env.NEXUS_VECTOR_SEARCH;
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("isVectorSearchEnabled", () => {
  it("is off unless the flag is exactly 'enabled'", () => {
    expect(isVectorSearchEnabled()).toBe(false);
    process.env.NEXUS_VECTOR_SEARCH = "true";
    expect(isVectorSearchEnabled()).toBe(false);
    process.env.NEXUS_VECTOR_SEARCH = "enabled";
    expect(isVectorSearchEnabled()).toBe(true);
  });
});

describe("generateEmbedding", () => {
  it("makes no network call when the feature flag is off", async () => {
    process.env.OPENAI_API_KEY = "sk-test";

    await expect(generateEmbedding("board pack")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes no network call when the API key is missing", async () => {
    process.env.NEXUS_VECTOR_SEARCH = "enabled";

    await expect(generateEmbedding("board pack")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the embedding vector from the provider", async () => {
    enableVectorSearch();
    fetchMock.mockResolvedValue(embeddingResponse([0.1, 0.2, 0.3]));

    await expect(generateEmbedding("board pack")).resolves.toEqual([0.1, 0.2, 0.3]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body)).toEqual({ model: "text-embedding-3-small", input: "board pack" });
  });

  it("truncates long input to the provider character budget", async () => {
    enableVectorSearch();
    fetchMock.mockResolvedValue(embeddingResponse([0.1]));

    await generateEmbedding("x".repeat(20_000));

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input).toHaveLength(8_000);
  });

  it("returns null on a non-OK response, an empty payload, or a network error", async () => {
    enableVectorSearch();

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(generateEmbedding("board pack")).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    await expect(generateEmbedding("board pack")).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(generateEmbedding("board pack")).resolves.toBeNull();
  });
});

describe("cosineSimilarity", () => {
  it("scores identical vectors at 1 and orthogonal vectors at 0", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for mismatched, empty, or zero vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});
