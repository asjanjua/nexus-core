/**
 * GET /api/prompts — a read that stays a read.
 *
 * The defect this catches (found 2026-08-08): the handler called
 * syncPromptRegistry(), which performs a platform-wide
 * `repository.upsertPromptRegistry` on the shared prompt_registry table. The
 * Prompts tab in /settings is customer-facing, so every client admin opening it
 * drove a write to a table no tenant owns. A GET that mutates shared state is
 * also a free write-amplification lever for anyone holding a session.
 *
 * The write was additionally pointless: the response is built from the
 * in-memory registry, and repository.listPromptRegistry() — the only reader of
 * that table — is called nowhere in the codebase.
 *
 * These tests pin both halves: the response still contains what the settings
 * tab needs, and nothing touches the database on the way.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireScope: vi.fn(),
  upsertPromptRegistry: vi.fn(),
  listPromptRegistryFromDb: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ requireScope: mocks.requireScope }));

// Any call to either of these means the route reached for the database.
vi.mock("@/lib/data/repository", () => ({
  repository: {
    upsertPromptRegistry: mocks.upsertPromptRegistry,
    listPromptRegistry: mocks.listPromptRegistryFromDb,
  },
}));

const { GET } = await import("@/app/api/prompts/route");

const ctx = { workspaceId: "org_customer", userId: "user_admin", scopes: ["*"] };

function request(): Request {
  return new Request("https://app.pinavia.io/api/prompts");
}

describe("GET /api/prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireScope.mockResolvedValue({ ctx, error: null });
    mocks.upsertPromptRegistry.mockResolvedValue(undefined);
    mocks.listPromptRegistryFromDb.mockResolvedValue([]);
  });

  /** The regression. A read must not write. */
  it("does not write to the prompt registry table", async () => {
    await GET(request());

    expect(mocks.upsertPromptRegistry).not.toHaveBeenCalled();
  });

  it("does not read the prompt registry table either — the manifest is code-defined", async () => {
    await GET(request());

    expect(mocks.listPromptRegistryFromDb).not.toHaveBeenCalled();
  });

  it("still returns the fields the settings Prompts tab renders", async () => {
    const response = await GET(request());
    const body = (await response.json()) as {
      ok: boolean;
      data: { prompts: Array<Record<string, unknown>> };
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.prompts.length).toBeGreaterThan(0);
    // PromptManifestEntry in app/settings/page.tsx.
    for (const key of ["key", "version", "owner", "description", "changelog", "lastUpdated"]) {
      expect(body.data.prompts[0]).toHaveProperty(key);
    }
  });

  /**
   * The whole point of stripping `template`: this endpoint publishes the
   * manifest, not the prompts themselves.
   */
  it("never leaks template bodies", async () => {
    const response = await GET(request());
    const raw = await response.text();

    expect(raw).not.toContain("\"template\"");
  });

  it("propagates the auth failure rather than answering anyway", async () => {
    mocks.requireScope.mockResolvedValue({
      ctx: null,
      error: new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 }),
    });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.upsertPromptRegistry).not.toHaveBeenCalled();
  });
});
