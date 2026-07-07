import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/repository", () => ({
  repository: {
    pruneReadinessSubmissions: vi.fn().mockResolvedValue({ deleted: 3 }),
    pushAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

import { POST } from "@/app/api/cron/readiness-prune/route";
import { repository } from "@/lib/data/repository";

const ORIGINAL_ENV = { ...process.env };

function request(secret?: string) {
  return new Request("http://localhost/api/cron/readiness-prune", {
    method: "POST",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("readiness prune cron", () => {
  it("requires cron configuration", async () => {
    delete process.env.NEXUS_CRON_SECRET;

    const res = await POST(request());

    expect(res.status).toBe(503);
    expect(repository.pruneReadinessSubmissions).not.toHaveBeenCalled();
  });

  it("rejects requests without the cron secret", async () => {
    process.env.NEXUS_CRON_SECRET = "secret";

    const res = await POST(request());

    expect(res.status).toBe(401);
    expect(repository.pruneReadinessSubmissions).not.toHaveBeenCalled();
  });

  it("prunes expired and consumed rows when authorized", async () => {
    process.env.NEXUS_CRON_SECRET = "secret";

    const res = await POST(request("secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { deleted: 3 } });
    expect(repository.pushAudit).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: "public-readiness",
      type: "readiness.prune_ran",
      actor: "cron",
      payload: { deleted: 3 },
    }));
  });
});
