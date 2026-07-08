import { describe, expect, it } from "vitest";

import { captureHandledError, captureDegradedState } from "@/lib/observability/sentry";

describe("captureHandledError", () => {
  it("does not throw for an Error instance with route/errorType/workspaceId", () => {
    const err = new Error("boom");
    expect(() =>
      captureHandledError(err, {
        route: "/api/billing/webhook",
        errorType: "webhook_processing_failed",
        workspaceId: "workspace-test",
      })
    ).not.toThrow();
  });

  it("does not throw for a non-Error throwable", () => {
    expect(() =>
      captureHandledError("string failure", {
        route: "/api/billing/webhook",
        errorType: "webhook_processing_failed",
      })
    ).not.toThrow();
  });

  it("does not crash when workspaceId is missing", () => {
    expect(() =>
      captureHandledError(new Error("no workspace"), {
        route: "/api/cron/dispatch",
        errorType: "dispatch_failed",
      })
    ).not.toThrow();
  });

  it("does not crash when extra context is provided", () => {
    expect(() =>
      captureHandledError(new Error("boom"), {
        route: "/api/billing/webhook",
        errorType: "webhook_processing_failed",
        extra: { eventId: "evt_123" },
      })
    ).not.toThrow();
  });
});

describe("captureDegradedState", () => {
  it("does not throw for a degraded-state message with route/errorType tags", () => {
    expect(() =>
      captureDegradedState("all LLM fallback providers exhausted", {
        route: "/api/synthesis",
        errorType: "llm_fallback_exhausted",
        workspaceId: "workspace-test",
      })
    ).not.toThrow();
  });

  it("does not crash when workspaceId is missing", () => {
    expect(() =>
      captureDegradedState("degraded", {
        route: "/api/synthesis",
        errorType: "llm_fallback_exhausted",
      })
    ).not.toThrow();
  });
});
