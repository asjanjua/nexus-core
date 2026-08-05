import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The evidence ceiling is now ENFORCED, not merely displayed.
 *
 * /pricing sells "50 documents" on Starter and "1,000" on Growth. Nothing
 * stopped a Starter workspace ingesting fifty thousand. checkEvidenceLimit
 * existed, was correct, and was called from nowhere.
 *
 * It is enforced at ingestEvidence rather than in the routes because thirteen
 * call sites reach that function — every connector, the upload endpoint, the
 * demo seeder, the Slack adapter. A check copied into each is a check missing
 * from the fourteenth, which is exactly how four separate engines came to
 * write the same wrong tag comparison.
 *
 * Two properties matter more than the counting:
 *
 *   It REFUSES rather than truncating. The caller still holds the file, so a
 *   refusal costs a retry; silently dropping would cost them evidence they
 *   believe is in the system, on a product whose whole claim is that nothing
 *   goes missing.
 *
 *   It FAILS OPEN. A billing lookup that throws lets the work through. A
 *   billing outage that halts a paying customer's pilot is worse than a
 *   workspace briefly exceeding a ceiling we can reconcile later.
 */

const getWorkspaceBillingState = vi.fn(async (_ws: string) => ({ plan: "pro" }) as { plan: string } | null);
const getEvidenceForWorkspace = vi.fn(async (_ws: string) => [] as Array<{ id: string }>);
const getPlanDefinition = vi.fn(async (_plan: string) => null as { maxEvidence: number } | null);
const getWorkspaceSettings = vi.fn(async (_ws: string) => ({ quarantineThreshold: 0.5 }));
const addEvidenceRecord = vi.fn(async (r: unknown) => r);
const pushAudit = vi.fn(async () => undefined);
const storeEmbedding = vi.fn(async () => undefined);

vi.mock("@/lib/data/repository", () => ({
  repository: {
    getWorkspaceBillingState,
    getEvidenceForWorkspace,
    getPlanDefinition,
    getWorkspaceSettings,
    addEvidenceRecord,
    pushAudit,
    storeEmbedding,
  },
}));
vi.mock("@/lib/observability/sentry", () => ({ captureHandledError: vi.fn() }));
vi.mock("@/lib/services/embeddings", () => ({
  generateEmbedding: vi.fn(async () => null),
  isVectorSearchEnabled: () => false,
}));
vi.mock("@/lib/services/entity-extraction", () => ({
  extractAndStoreEntitiesForEvidence: vi.fn(async () => undefined),
}));

const { ingestEvidence, EvidenceLimitReachedError } = await import("@/lib/services/ingestion");

const docs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}` }));

const INPUT = {
  workspaceId: "ws-1",
  tenantId: "t-1",
  sourceType: "upload" as const,
  sourcePath: "/uploads/a.pdf",
  sourceTimestamp: new Date().toISOString(),
  hash: "sha256:abc",
  sensitivity: "internal" as const,
  extractionConfidence: 0.9,
  text: "Some evidence text.",
};

beforeEach(() => {
  getWorkspaceBillingState.mockReset().mockResolvedValue({ plan: "pro" });
  getEvidenceForWorkspace.mockReset().mockResolvedValue([]);
  getPlanDefinition.mockReset().mockResolvedValue(null);
  getWorkspaceSettings.mockReset().mockResolvedValue({ quarantineThreshold: 0.5 });
  addEvidenceRecord.mockReset().mockImplementation(async (r: unknown) => r);
  pushAudit.mockReset().mockResolvedValue(undefined);
});

describe("ingestEvidence evidence ceiling", () => {
  it("ingests normally below the ceiling", () => {
    getEvidenceForWorkspace.mockResolvedValue(docs(10));
    return expect(ingestEvidence(INPUT)).resolves.toMatchObject({ workspaceId: "ws-1" });
  });

  it("refuses at the ceiling and writes nothing", async () => {
    // Pro is 1000 in PLAN_FALLBACKS.
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    await expect(ingestEvidence(INPUT)).rejects.toBeInstanceOf(EvidenceLimitReachedError);
    // The important half: no partial record, no orphaned row to reconcile.
    expect(addEvidenceRecord).not.toHaveBeenCalled();
  });

  it("refuses above the ceiling, not only exactly at it", async () => {
    // A workspace can already be over after a plan downgrade. Using `>=`
    // rather than `===` is what stops a downgrade quietly re-opening ingest.
    getEvidenceForWorkspace.mockResolvedValue(docs(1500));
    await expect(ingestEvidence(INPUT)).rejects.toBeInstanceOf(EvidenceLimitReachedError);
  });

  it("names a plan the customer is not already on", async () => {
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    // Captured via a rejection handler rather than `.catch(e => e)`, which
    // types as the union of the error AND the resolved record — it compiles
    // under vitest and fails tsc, which is how a green test run can still
    // break the build.
    const err = await ingestEvidence(INPUT).then(
      () => null,
      (e: unknown) => e as InstanceType<typeof EvidenceLimitReachedError>
    );
    expect(err).toBeInstanceOf(EvidenceLimitReachedError);
    if (!err) throw new Error("expected a refusal");
    // planKey "pro" is the tier sold as Starter, so the upgrade offered must
    // be Growth. Telling a Starter customer to upgrade to Starter is the bug
    // this guards, and it is what the code did before checkEvidenceLimit was
    // corrected.
    expect(err.requiredPlan).toBe("Growth");
    expect(err.requiredPlan?.toLowerCase()).not.toContain("starter");
    expect(err.used).toBe(1000);
    expect(err.limit).toBe(1000);
  });

  it("carries the numbers so a caller can explain the refusal", async () => {
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    const err = await ingestEvidence(INPUT).then(
      () => null,
      (e: unknown) => e as Error
    );
    // A bare "limit reached" forces the user to go hunting for their own count.
    expect(err?.message).toContain("1000");
  });

  it("never blocks an unlimited plan", async () => {
    // Enterprise is -1. An off-by-one that read -1 as a ceiling would block
    // the highest-paying customers first.
    getPlanDefinition.mockResolvedValue({ maxEvidence: -1 });
    getEvidenceForWorkspace.mockResolvedValue(docs(50_000));
    await expect(ingestEvidence(INPUT)).resolves.toBeTruthy();
  });

  it("honours a negotiated ceiling from the database over the fallback", async () => {
    // Enterprise contracts are per-deal. Measuring them against the hardcoded
    // default would enforce a number nobody agreed to.
    getPlanDefinition.mockResolvedValue({ maxEvidence: 25_000 });
    getEvidenceForWorkspace.mockResolvedValue(docs(20_000));
    await expect(ingestEvidence(INPUT)).resolves.toBeTruthy();
  });

  it("fails open when the billing lookup throws", async () => {
    // Deliberate. Halting a paying pilot because billing is down is a worse
    // failure than a temporary overage.
    getWorkspaceBillingState.mockRejectedValue(new Error("db down"));
    await expect(ingestEvidence(INPUT)).resolves.toBeTruthy();
    expect(addEvidenceRecord).toHaveBeenCalled();
  });

  it("fails open when the evidence count throws", async () => {
    getEvidenceForWorkspace.mockRejectedValue(new Error("db down"));
    await expect(ingestEvidence(INPUT)).resolves.toBeTruthy();
  });

  it("checks the ceiling before doing any work", async () => {
    // Ordering matters at the route level too: the upload endpoint writes the
    // original to R2 before calling this. If the check ran late, a refused
    // upload would still leave an orphaned object in storage.
    getEvidenceForWorkspace.mockResolvedValue(docs(1000));
    await ingestEvidence(INPUT).catch(() => {});
    expect(getWorkspaceSettings).not.toHaveBeenCalled();
  });
});
