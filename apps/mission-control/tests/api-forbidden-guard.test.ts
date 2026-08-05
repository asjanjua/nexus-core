import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * guardForbiddenAction is the enforcement layer behind all four product
 * boundaries, and it had no test.
 *
 * Everything the product claims about governance runs through this function.
 * If it ever returns null for a forbidden action, every boundary becomes
 * decorative while the registry, the docs and the UI copy all still say
 * otherwise — the worst possible failure, because nothing looks wrong.
 *
 * The subtle half is the audit write. It is deliberately AWAITED here, unlike
 * the fire-and-forget writes elsewhere, because the record IS the feature:
 * a blocked attempt that leaves no trace is indistinguishable from an attempt
 * that never happened. But it must not be able to turn a clean refusal into a
 * 500 — the refusal has to hold even when the log does not.
 */

type AuditWrite = {
  workspaceId: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
};

// Typed so mock.calls[0][0] is a real object rather than an empty tuple.
// An untyped vi.fn() compiles here but fails tsc, which is how a test can pass
// while the build breaks.
const pushAudit = vi.fn(async (_input: AuditWrite): Promise<undefined> => undefined);
const captureHandledError = vi.fn();

vi.mock("@/lib/data/repository", () => ({ repository: { pushAudit } }));
vi.mock("@/lib/observability/sentry", () => ({ captureHandledError }));

const { guardForbiddenAction } = await import("@/lib/api-forbidden");

const CALL = {
  product: "meridian" as const,
  action: "submit",
  workspaceId: "ws-1",
  actor: "user-1",
};

beforeEach(() => {
  pushAudit.mockReset();
  pushAudit.mockResolvedValue(undefined);
  captureHandledError.mockReset();
});

describe("guardForbiddenAction", () => {
  it("returns null for an action that is not forbidden", async () => {
    // A guard that blocked the product's actual work would be removed by
    // whoever hit it first.
    const result = await guardForbiddenAction({ ...CALL, action: "draft_memo" });
    expect(result).toBeNull();
    expect(pushAudit).not.toHaveBeenCalled();
  });

  it.each([
    ["meridian", "submit", "meridian.filing_blocked"],
    ["quorum", "finalize_minutes", "quorum.finalisation_blocked"],
    ["vantage", "approve_deal", "vantage.decision_blocked"],
    ["nucleus", "publish_client_advice", "nucleus.publish_blocked"],
  ] as const)("blocks %s/%s with a 403 and audits %s", async (product, action, event) => {
    const result = await guardForbiddenAction({ ...CALL, product, action });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(pushAudit).toHaveBeenCalledTimes(1);
    expect(pushAudit.mock.calls[0][0]).toMatchObject({
      workspaceId: "ws-1",
      type: event,
      actor: "user-1",
    });
  });

  it("records the refusal and the human path, not merely that it was denied", async () => {
    // The trail has to show where the system pointed the human instead. "Access
    // denied" answers nothing when a regulator asks what happened next.
    await guardForbiddenAction(CALL);
    const payload = pushAudit.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.product).toBe("meridian");
    expect(payload.attemptedAction).toBe("submit");
    expect(String(payload.refusal).length).toBeGreaterThan(0);
    expect(String(payload.humanPath)).toMatch(/authorised filer/i);
  });

  it("carries caller context into the audit payload", async () => {
    await guardForbiddenAction({ ...CALL, context: { filingRef: "SBP-2026-01" } });
    const payload = pushAudit.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.filingRef).toBe("SBP-2026-01");
  });

  it("still refuses when the audit write throws", async () => {
    // The refusal must not depend on the logger. A 500 here would let a caller
    // retry into a different code path, or read the failure as transient.
    pushAudit.mockRejectedValue(new Error("db down"));
    const result = await guardForbiddenAction(CALL);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("reports an audit failure rather than swallowing it", async () => {
    // A silently unaudited block is a governance gap: the boundary held but
    // nothing can prove it did.
    pushAudit.mockRejectedValue(new Error("db down"));
    await guardForbiddenAction(CALL);
    expect(captureHandledError).toHaveBeenCalledTimes(1);
    expect(captureHandledError.mock.calls[0][1]).toMatchObject({
      route: "guardForbiddenAction",
      errorType: "meridian.filing_blocked",
      workspaceId: "ws-1",
    });
  });

  it("awaits the audit write before answering", async () => {
    // Fire-and-forget would let the route return 403 and the process die
    // before the record lands. Elsewhere that trade is right; here the record
    // is the feature.
    let settled = false;
    pushAudit.mockImplementation(
      () =>
        new Promise<undefined>((resolve) =>
          setTimeout(() => {
            settled = true;
            resolve(undefined);
          }, 10)
        )
    );
    await guardForbiddenAction(CALL);
    expect(settled).toBe(true);
  });

  it("returns the registry refusal text in the response body", async () => {
    const result = await guardForbiddenAction(CALL);
    const body = await result!.json();
    expect(JSON.stringify(body)).toMatch(/cannot file, submit, certify, or sign/i);
  });
});
