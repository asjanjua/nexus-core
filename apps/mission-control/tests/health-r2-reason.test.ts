import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * /api/health must say WHICH R2 setting is wrong.
 *
 * Observed in production on 2026-08-08: status `degraded`, with
 * `originalsStorage: { ok: false, enabled: true }` and nothing else. R2 has
 * four settings, so that is a four-way guess against a live service while
 * uploaded originals are silently not being retained.
 *
 * The reason was already computed — r2ConfigProblem() names the first
 * structural fault — and the health endpoint discarded it.
 */

const healthCheck = vi.fn(async () => ({ ok: true, usingDatabase: true }));
const isOriginalStorageEnabled = vi.fn(() => true);
const r2ConfigProblem = vi.fn<() => string | null>(() => null);

vi.mock("@/lib/data/repository", () => ({ repository: { healthCheck } }));
vi.mock("@/lib/services/object-storage", () => ({ isOriginalStorageEnabled, r2ConfigProblem }));

const { GET } = await import("@/app/api/health/route");

const ORIGINAL = { ...process.env };

type Payload = {
  data: {
    status: string;
    checks: { originalsStorage: { ok: boolean; enabled: boolean; problem?: string } };
  };
};

async function health() {
  const res = await GET();
  return ((await res.json()) as Payload).data;
}

beforeEach(() => {
  healthCheck.mockReset().mockResolvedValue({ ok: true, usingDatabase: true });
  isOriginalStorageEnabled.mockReset().mockReturnValue(true);
  r2ConfigProblem.mockReset().mockReturnValue(null);
  process.env.NEXUS_R2_ORIGINALS = "enabled";
  process.env.DEEPSEEK_API_KEY = "x";
  process.env.NEXUS_LLM_PROVIDER = "deepseek";
  delete process.env.NEXUS_VECTOR_SEARCH;
});

afterEach(() => { process.env = { ...ORIGINAL }; });

describe("originals storage reports its reason", () => {
  it("names the failing setting when storage is misconfigured", () => {
    isOriginalStorageEnabled.mockReturnValue(false);
    r2ConfigProblem.mockReturnValue("malformed_account_id");
    return health().then((d) => {
      expect(d.checks.originalsStorage.ok).toBe(false);
      expect(d.checks.originalsStorage.problem).toBe("malformed_account_id");
      expect(d.status).toBe("degraded");
    });
  });

  it("omits the field entirely when healthy", async () => {
    // Not `problem: null`. A reader should never have to interpret a null.
    const d = await health();
    expect(d.checks.originalsStorage.ok).toBe(true);
    expect("problem" in d.checks.originalsStorage).toBe(false);
  });

  it("stays quiet when originals storage is switched off", async () => {
    // Disabled is a configuration choice, not a fault, and must not degrade
    // the service or emit a reason.
    process.env.NEXUS_R2_ORIGINALS = "disabled";
    const d = await health();
    expect(d.checks.originalsStorage.enabled).toBe(false);
    expect(d.checks.originalsStorage.ok).toBe(true);
    expect("problem" in d.checks.originalsStorage).toBe(false);
    expect(d.status).toBe("ok");
  });

  it("never leaks a credential value, only the setting name", async () => {
    // The whole reason this is safe to expose unauthenticated.
    isOriginalStorageEnabled.mockReturnValue(false);
    r2ConfigProblem.mockReturnValue("missing_secret_access_key");
    process.env.R2_SECRET_ACCESS_KEY = "super-secret-value";
    const res = await GET();
    const body = JSON.stringify(await res.json());
    expect(body).toContain("missing_secret_access_key");
    expect(body).not.toContain("super-secret-value");
  });
});
