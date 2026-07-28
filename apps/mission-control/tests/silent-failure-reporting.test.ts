/**
 * Regression: paths that degrade instead of failing must leave a trace.
 *
 * Each case below used to swallow its error entirely, so a permanently
 * degraded workspace (no embeddings, budgets not enforced, a connector whose
 * credentials no longer decrypt) looked identical to a healthy one from
 * outside the process.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

function loggedLines(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
}

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("embedding generation", () => {
  it("reports an unreachable embedding provider instead of returning null silently", async () => {
    vi.stubEnv("NEXUS_VECTOR_SEARCH", "enabled");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const { generateEmbedding } = await import("@/lib/services/embeddings");

    await expect(generateEmbedding("hello")).resolves.toBeNull();
    expect(loggedLines(errorSpy)).toContain("embedding_request_failed");
    expect(loggedLines(errorSpy)).toContain("connect ECONNREFUSED");
  });

  it("reports a non-OK response from the embedding provider", async () => {
    vi.stubEnv("NEXUS_VECTOR_SEARCH", "enabled");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { generateEmbedding } = await import("@/lib/services/embeddings");

    await expect(generateEmbedding("hello")).resolves.toBeNull();
    expect(loggedLines(warnSpy)).toContain("embedding_request_failed");
    expect(loggedLines(warnSpy)).toContain("401");
  });

  it("reports a missing key once, not on every call", async () => {
    vi.stubEnv("NEXUS_VECTOR_SEARCH", "enabled");
    vi.stubEnv("OPENAI_API_KEY", "");

    const { generateEmbedding } = await import("@/lib/services/embeddings");

    await generateEmbedding("one");
    await generateEmbedding("two");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(loggedLines(warnSpy)).toContain("embedding_provider_unconfigured");
  });

  it("stays silent when the feature is switched off", async () => {
    vi.stubEnv("NEXUS_VECTOR_SEARCH", "");

    const { generateEmbedding } = await import("@/lib/services/embeddings");

    await expect(generateEmbedding("hello")).resolves.toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("token budget enforcement", () => {
  it("reports when it fails open rather than allowing the call silently", async () => {
    vi.doMock("@/lib/data/repository", () => ({
      repository: {
        getWorkspaceBillingState: vi.fn().mockRejectedValue(new Error("db unavailable")),
        getPlanDefinition: vi.fn(),
      },
    }));

    const { checkTokenBudget } = await import("@/lib/billing/budget");

    await expect(checkTokenBudget("workspace-alpha")).resolves.toMatchObject({ allowed: true });
    expect(loggedLines(errorSpy)).toContain("budget_check_failed_open");
    expect(loggedLines(errorSpy)).toContain("workspace=workspace-alpha");
  });

  it("reports a feature gate that fails open", async () => {
    vi.doMock("@/lib/data/repository", () => ({
      repository: {
        getWorkspaceBillingState: vi.fn().mockRejectedValue(new Error("db unavailable")),
        getPlanDefinition: vi.fn(),
      },
    }));

    const { canUseFeature } = await import("@/lib/billing/budget");

    await expect(canUseFeature("workspace-alpha", "exports")).resolves.toMatchObject({ allowed: true });
    expect(loggedLines(errorSpy)).toContain("feature_gate_failed_open");
  });
});

describe("ingestion side effects", () => {
  it("reports a failed embedding write instead of raising an unhandled rejection", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    vi.doMock("@/lib/services/embeddings", () => ({
      isVectorSearchEnabled: () => true,
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
    }));
    vi.doMock("@/lib/services/entity-extraction", () => ({
      extractAndStoreEntitiesForEvidence: vi.fn().mockResolvedValue(undefined),
    }));
    const storeEmbedding = vi.fn().mockRejectedValue(new Error("pgvector column missing"));
    vi.doMock("@/lib/data/repository", () => ({
      repository: {
        getWorkspaceSettings: vi.fn().mockResolvedValue({ name: "Acme", quarantineThreshold: 0.35 }),
        addEvidenceRecord: vi.fn().mockImplementation(async (record) => record),
        storeEmbedding,
      },
    }));

    const { ingestEvidence } = await import("@/lib/services/ingestion");

    await ingestEvidence({
      workspaceId: "workspace-alpha",
      tenantId: "tenant-alpha",
      sourceType: "upload",
      sourcePath: "/uploads/board-pack.pdf",
      sourceTimestamp: new Date().toISOString(),
      hash: "abc123",
      sensitivity: "internal",
      extractionConfidence: 0.9,
      text: "quarterly revenue is up",
    });

    // Let the fire-and-forget chain settle.
    await new Promise((resolve) => setImmediate(resolve));

    expect(storeEmbedding).toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
    expect(loggedLines(errorSpy)).toContain("embedding_store_failed");
    expect(loggedLines(errorSpy)).toContain("pgvector column missing");

    process.off("unhandledRejection", unhandled);
  });
});
