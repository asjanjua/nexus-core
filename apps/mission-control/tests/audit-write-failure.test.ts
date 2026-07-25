/**
 * Regression: a failed audit write must leave a trace.
 *
 * Callers are fire-and-forget (`void repository.pushAudit(...).catch(() => {})`),
 * so a throw inside pushAudit vanished silently — the lost audit row appeared
 * nowhere, which is a poor property for a product sold on its evidence trail.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { captureHandledError, captureDegradedState } from "@/lib/observability/sentry";

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

describe("observability reporting", () => {
  it("emits a structured line for a handled error", () => {
    captureHandledError(new Error("db unavailable"), {
      route: "repository.pushAudit",
      errorType: "audit_write_failed",
      workspaceId: "workspace-alpha",
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).toContain("audit_write_failed");
    expect(line).toContain("route=repository.pushAudit");
    expect(line).toContain("workspace=workspace-alpha");
    expect(line).toContain("db unavailable");
  });

  it("handles a non-Error throwable without crashing", () => {
    captureHandledError("string failure", {
      route: "/api/billing/webhook",
      errorType: "webhook_processing_failed",
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain("string failure");
  });

  it("omits the workspace field when none is supplied", () => {
    captureHandledError(new Error("x"), { route: "/api/cron/dispatch", errorType: "dispatch_failed" });
    expect(String(errorSpy.mock.calls[0][0])).not.toContain("workspace=");
  });

  it("does not log caller-supplied extra payloads, which can carry PII", () => {
    captureHandledError(new Error("boom"), {
      route: "repository.pushAudit",
      errorType: "audit_write_failed",
      extra: { email: "someone@example.com", secret: "tok_live_abc" },
    });

    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).not.toContain("someone@example.com");
    expect(line).not.toContain("tok_live_abc");
  });

  it("reports a degraded state at warn level", () => {
    captureDegradedState("all providers exhausted", {
      route: "lib/services/llm",
      errorType: "llm_chain_exhausted",
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("all providers exhausted");
  });
});

describe("pushAudit failure handling", () => {
  const originalRequired = process.env.NEXUS_DB_REQUIRED;
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalRequired === undefined) delete process.env.NEXUS_DB_REQUIRED;
    else process.env.NEXUS_DB_REQUIRED = originalRequired;
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  it("resolves and reports rather than rejecting when the write fails", async () => {
    // A required-but-absent database makes runDb throw, which is the path that
    // previously propagated into a call site that discarded it.
    process.env.NEXUS_DB_REQUIRED = "true";
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { repository } = await import("@/lib/data/repository");

    await expect(
      repository.pushAudit({
        workspaceId: "workspace-alpha",
        type: "reviewer_seat.invited",
        actor: "user-1",
        payload: {},
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).toContain("audit_write_failed");
    expect(line).toContain("workspace=workspace-alpha");
  });
});
