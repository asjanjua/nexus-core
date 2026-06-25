import { describe, expect, it, vi, beforeEach } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn(),
  setTagMock: vi.fn(),
  setLevelMock: vi.fn(),
  setContextMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => {
  const scope = {
    setTag: sentryMocks.setTagMock,
    setLevel: sentryMocks.setLevelMock,
    setContext: sentryMocks.setContextMock,
  };
  return {
    withScope: (cb: (scope: { setTag: typeof sentryMocks.setTagMock; setLevel: typeof sentryMocks.setLevelMock; setContext: typeof sentryMocks.setContextMock }) => void) => cb(scope),
    captureException: sentryMocks.captureExceptionMock,
    captureMessage: sentryMocks.captureMessageMock,
  };
});

import { captureHandledError, captureDegradedState } from "@/lib/observability/sentry";

describe("captureHandledError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures an Error instance as-is and tags route/errorType/workspaceId", () => {
    const err = new Error("boom");
    captureHandledError(err, {
      route: "/api/billing/webhook",
      errorType: "webhook_processing_failed",
      workspaceId: "workspace-test",
    });

    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("route", "/api/billing/webhook");
    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("errorType", "webhook_processing_failed");
    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("workspaceId", "workspace-test");
    expect(sentryMocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });

  it("wraps a non-Error throwable in an Error before capturing", () => {
    captureHandledError("string failure", {
      route: "/api/billing/webhook",
      errorType: "webhook_processing_failed",
    });

    const captured = sentryMocks.captureExceptionMock.mock.calls[0][0];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe("string failure");
  });

  it("does not crash and does not tag workspaceId when it is missing", () => {
    expect(() =>
      captureHandledError(new Error("no workspace"), {
        route: "/api/cron/dispatch",
        errorType: "dispatch_failed",
      })
    ).not.toThrow();

    const workspaceTagCalls = sentryMocks.setTagMock.mock.calls.filter((call) => call[0] === "workspaceId");
    expect(workspaceTagCalls).toHaveLength(0);
  });

  it("attaches extra context when provided", () => {
    captureHandledError(new Error("boom"), {
      route: "/api/billing/webhook",
      errorType: "webhook_processing_failed",
      extra: { eventId: "evt_123" },
    });

    expect(sentryMocks.setContextMock).toHaveBeenCalledWith("details", { eventId: "evt_123" });
  });
});

describe("captureDegradedState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures a message at warning level with route/errorType tags", () => {
    captureDegradedState("all LLM fallback providers exhausted", {
      route: "/api/synthesis",
      errorType: "llm_fallback_exhausted",
      workspaceId: "workspace-test",
    });

    expect(sentryMocks.setLevelMock).toHaveBeenCalledWith("warning");
    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("route", "/api/synthesis");
    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("errorType", "llm_fallback_exhausted");
    expect(sentryMocks.setTagMock).toHaveBeenCalledWith("workspaceId", "workspace-test");
    expect(sentryMocks.captureMessageMock).toHaveBeenCalledWith("all LLM fallback providers exhausted");
  });

  it("does not crash when workspaceId is missing", () => {
    expect(() =>
      captureDegradedState("degraded", {
        route: "/api/synthesis",
        errorType: "llm_fallback_exhausted",
      })
    ).not.toThrow();

    const workspaceTagCalls = sentryMocks.setTagMock.mock.calls.filter((call) => call[0] === "workspaceId");
    expect(workspaceTagCalls).toHaveLength(0);
  });
});
