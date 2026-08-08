/**
 * PATCH /api/workspace/board-profile — input validation.
 *
 * Before this, the route read `body.boardType`, `body.quorumRequirement` and so
 * on straight into the upsert with no schema. The failure mode was not a
 * breach — the route picks fields explicitly, so a caller could not reach a
 * column it was not offered — but everything else about it was wrong:
 *
 *   - a 200-character jurisdiction hit varchar(64) and threw
 *   - a string in an integer column threw
 *   - `nextMeetingAt: "soon"` became Invalid Date and threw
 *
 * All three surfaced as the same blanket 500 `board_profile_update_failed`,
 * which tells the caller nothing about which field was at fault.
 *
 * Bounds here mirror db/schema.ts. If a column's width changes and this file is
 * not updated, these tests keep passing while production starts rejecting valid
 * input — so the schema and this file must move together.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireScope: vi.fn(),
  upsertBoardProfile: vi.fn(),
  getBoardProfile: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ requireScope: mocks.requireScope }));
vi.mock("@/lib/data/repository", () => ({
  repository: {
    upsertBoardProfile: mocks.upsertBoardProfile,
    getBoardProfile: mocks.getBoardProfile,
  },
}));

const { PATCH } = await import("@/app/api/workspace/board-profile/route");

const ctx = { workspaceId: "org_customer", userId: "user_admin", scopes: ["*"] };

function patch(body: unknown): Request {
  return new Request("https://app.pinavia.io/api/workspace/board-profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH board-profile validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireScope.mockResolvedValue({ ctx, error: null });
    mocks.upsertBoardProfile.mockResolvedValue({ id: "board-org_customer" });
  });

  it("accepts a valid partial update and forwards only the sent keys", async () => {
    const response = await PATCH(patch({ quorumRequirement: 3 }));

    expect(response.status).toBe(200);
    // PATCH semantics: omitted fields must not be forwarded at all, rather than
    // forwarded as undefined and relying on the ORM to skip them.
    expect(mocks.upsertBoardProfile).toHaveBeenCalledWith("org_customer", {
      quorumRequirement: 3,
    });
  });

  it("rejects a jurisdiction longer than the varchar(64) column", async () => {
    const response = await PATCH(patch({ jurisdiction: "x".repeat(65) }));
    const body = (await response.json()) as { error: string; fields: Array<{ path: string }> };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_request");
    expect(body.fields[0].path).toBe("jurisdiction");
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });

  it("rejects a boardType longer than the varchar(32) column", async () => {
    const response = await PATCH(patch({ boardType: "y".repeat(33) }));

    expect(response.status).toBe(400);
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });

  it("rejects a string where an integer column is expected", async () => {
    const response = await PATCH(patch({ quorumRequirement: "three" }));

    expect(response.status).toBe(400);
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });

  it("rejects a fractional quorum, which an integer column cannot hold", async () => {
    const response = await PATCH(patch({ quorumRequirement: 2.5 }));

    expect(response.status).toBe(400);
  });

  /** A board that reaches quorum with nobody present is not a board. */
  it("rejects a quorum of zero", async () => {
    const response = await PATCH(patch({ quorumRequirement: 0 }));

    expect(response.status).toBe(400);
  });

  /** Zero notice is legitimate for an emergency board and must stay allowed. */
  it("allows a notice period of zero days", async () => {
    const response = await PATCH(patch({ noticePeriodDays: 0 }));

    expect(response.status).toBe(200);
  });

  it("rejects a nextMeetingAt that is not a real timestamp", async () => {
    const response = await PATCH(patch({ nextMeetingAt: "soon" }));
    const body = (await response.json()) as { fields: Array<{ path: string }> };

    expect(response.status).toBe(400);
    expect(body.fields[0].path).toBe("nextMeetingAt");
    // This is the one that produced Invalid Date and a Postgres error.
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });

  it("accepts a valid ISO timestamp with offset", async () => {
    const response = await PATCH(patch({ nextMeetingAt: "2026-09-01T10:00:00Z" }));

    expect(response.status).toBe(200);
  });

  it("allows clearing a nullable field", async () => {
    const response = await PATCH(patch({ chairpersonName: null }));

    expect(response.status).toBe(200);
    expect(mocks.upsertBoardProfile).toHaveBeenCalledWith("org_customer", {
      chairpersonName: null,
    });
  });

  /**
   * Not a privilege escalation — the route never offered these columns — but a
   * caller sending them should be told they were refused rather than left
   * believing the write took effect.
   */
  it("refuses unknown keys instead of silently ignoring them", async () => {
    const response = await PATCH(patch({ workspaceId: "org_someone_else", boardType: "statutory" }));

    expect(response.status).toBe(400);
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });

  it("refuses an empty patch rather than reporting a no-op as success", async () => {
    const response = await PATCH(patch({}));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("no_fields_to_update");
  });

  it("returns 400 on malformed JSON rather than a 500", async () => {
    const response = await PATCH(
      new Request("https://app.pinavia.io/api/workspace/board-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{not json",
      })
    );

    expect(response.status).toBe(400);
  });

  it("propagates the auth failure rather than writing anyway", async () => {
    mocks.requireScope.mockResolvedValue({
      ctx: null,
      error: new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 }),
    });

    const response = await PATCH(patch({ boardType: "statutory" }));

    expect(response.status).toBe(401);
    expect(mocks.upsertBoardProfile).not.toHaveBeenCalled();
  });
});
