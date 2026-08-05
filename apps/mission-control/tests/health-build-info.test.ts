import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * /api/health reports the commit it is running.
 *
 * Before this there was no way to ask the deployed application what it was.
 * "deployed at <sha>" — required as evidence by both the release gauntlet and
 * the live smoke procedure — could be asserted from the Render dashboard but
 * never demonstrated against the process actually answering requests. A push
 * that silently failed to build was indistinguishable from one that shipped,
 * which is exactly the confusion that produced a 404 on a page whose commits
 * were sitting unpushed.
 */

const healthCheck = vi.fn(async () => ({ ok: true, usingDatabase: true }));
vi.mock("@/lib/data/repository", () => ({ repository: { healthCheck } }));
vi.mock("@/lib/services/object-storage", () => ({ isOriginalStorageEnabled: () => true }));

const { GET } = await import("@/app/api/health/route");

const ORIGINAL = { ...process.env };

async function build() {
  const res = await GET();
  const body = (await res.json()) as { data: { build: Record<string, string> } };
  return body.data.build;
}

beforeEach(() => {
  healthCheck.mockReset().mockResolvedValue({ ok: true, usingDatabase: true });
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("health build info", () => {
  it("reports the Render commit and a short form to compare against git log", async () => {
    process.env.RENDER_GIT_COMMIT = "94bb9837189f584aca8798a94f06c134aeaa56f0";
    process.env.RENDER_GIT_BRANCH = "main";
    const info = await build();
    expect(info.commit).toBe("94bb9837189f584aca8798a94f06c134aeaa56f0");
    // Seven characters is what `git log --oneline` prints, so a human can
    // compare the two without counting.
    expect(info.commitShort).toBe("94bb983");
    expect(info.branch).toBe("main");
  });

  it("says unknown rather than omitting the field", async () => {
    // An absent field is ambiguous: it reads as an older build of this very
    // endpoint. An explicit "unknown" says the app is running somewhere that
    // does not inject the variable.
    delete process.env.RENDER_GIT_COMMIT;
    delete process.env.RENDER_GIT_BRANCH;
    const info = await build();
    expect(info.commit).toBe("unknown");
    expect(info.commitShort).toBe("unknown");
    expect(info.branch).toBe("unknown");
  });

  it("treats a blank variable as unknown", async () => {
    // Render injects an empty string in some configurations, which would
    // otherwise render as a blank field that looks like a UI bug.
    process.env.RENDER_GIT_COMMIT = "   ";
    expect((await build()).commit).toBe("unknown");
  });

  it("still reports the commit when a dependency is unhealthy", async () => {
    // The moment you most need to know what is deployed is when something is
    // wrong. Gating this behind a healthy check would withhold it exactly then.
    healthCheck.mockResolvedValue({ ok: false, usingDatabase: false });
    process.env.RENDER_GIT_COMMIT = "abc1234def";
    const res = await GET();
    const body = (await res.json()) as {
      data: { status: string; build: { commitShort: string } };
    };
    expect(body.data.status).toBe("degraded");
    expect(body.data.build.commitShort).toBe("abc1234");
  });
});
