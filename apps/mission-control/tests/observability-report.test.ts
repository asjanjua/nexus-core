/**
 * lib/observability/report.ts — structured reporting for swallowed error paths.
 *
 * Three properties this suite exists to hold, each of which was broken or
 * missing before docs/PR_REVIEW_2026-08-08.md §7.1 and §7.3:
 *
 *   1. `context.extra` reaches the log. It was accepted by the type and then
 *      silently discarded, while twelve call sites passed it.
 *   2. One event per line. An error message containing a newline used to split
 *      a single event across several lines.
 *   3. A sustained failure does not emit one line per call.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetReportCooldownForTests,
  reportDegradedState,
  reportHandledError,
} from "@/lib/observability/report";

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  __resetReportCooldownForTests();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
  vi.useRealTimers();
});

const lastErrorLine = () => String(errorSpy.mock.calls.at(-1)?.[0] ?? "");

describe("reportHandledError", () => {
  it("writes route, errorType, workspace and detail on one line", () => {
    reportHandledError(new Error("boom"), {
      route: "lib/example.doThing",
      errorType: "example_failed",
      workspaceId: "workspace-acme",
    });

    const line = lastErrorLine();
    expect(line).toContain("[observability] example_failed");
    expect(line).toContain("route=lib/example.doThing");
    expect(line).toContain("workspace=workspace-acme");
    expect(line).toContain("detail=boom");
  });

  it("includes allowlisted keys from context.extra", () => {
    reportHandledError(new Error("refresh rejected"), {
      route: "connectors.shared.getValidConnectorAuth",
      errorType: "connector_token_refresh_failed",
      workspaceId: "workspace-acme",
      extra: { connectorType: "sharepoint", attempt: 2 },
    });

    const line = lastErrorLine();
    expect(line).toContain("connectorType=sharepoint");
    expect(line).toContain("attempt=2");
  });

  it("drops non-allowlisted extra keys, which can carry PII or secrets", () => {
    // The property tests/audit-write-failure.test.ts has always pinned. The
    // allowlist is what lets operational metadata through WITHOUT reopening
    // this: the default for anything a caller invents is still "not logged".
    reportHandledError(new Error("boom"), {
      route: "repository.pushAudit",
      errorType: "audit_write_failed",
      extra: { email: "someone@example.com", secret: "tok_live_abc" },
    });

    const line = lastErrorLine();
    expect(line).not.toContain("someone@example.com");
    expect(line).not.toContain("tok_live_abc");
    expect(line).not.toContain("secret=");
  });

  it("counts omitted keys so a miswired call site is visible", () => {
    reportHandledError(new Error("boom"), {
      route: "repository.pushAudit",
      errorType: "audit_write_failed",
      extra: { connectorType: "slack", customerName: "Acme Bank", note: "x" },
    });

    const line = lastErrorLine();
    expect(line).toContain("connectorType=slack");
    expect(line).toContain("extraOmitted=2");
    expect(line).not.toContain("Acme Bank");
  });

  it("collapses a multi-line error message into a single log line", () => {
    reportHandledError(new Error("line one\nline two\r\nline three"), {
      route: "lib/example.doThing",
      errorType: "multiline_failed",
    });

    const line = lastErrorLine();
    expect(line).not.toContain("\n");
    expect(line).toContain("line one line two line three");
  });

  it("redacts Postgres constraint values and bare email addresses", () => {
    reportHandledError(
      new Error(
        'duplicate key value violates unique constraint "users_email_key" ' +
          "Key (email)=(ceo@client.com) already exists"
      ),
      { route: "repository.createUser", errorType: "duplicate_user" }
    );

    const line = lastErrorLine();
    expect(line).not.toContain("ceo@client.com");
    expect(line).toContain("(email)=(redacted)");
  });

  it("truncates a very long detail rather than flooding the log", () => {
    reportHandledError(new Error("x".repeat(5000)), {
      route: "lib/example.doThing",
      errorType: "long_detail",
    });

    expect(lastErrorLine().length).toBeLessThan(700);
  });

  it("handles a thrown non-Error without losing the event", () => {
    reportHandledError({ weird: true }, {
      route: "lib/example.doThing",
      errorType: "non_error_thrown",
    });

    expect(lastErrorLine()).toContain("detail=unknown_error");
  });
});

describe("report cooldown", () => {
  it("emits the same event once per cooldown window, not once per call", () => {
    for (let i = 0; i < 500; i++) {
      reportDegradedState(`embedding request failed with status 429`, {
        route: "lib/services/embeddings",
        errorType: "embedding_request_failed",
      });
    }

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("keys on the event shape, so a varying detail cannot defeat it", () => {
    for (let i = 0; i < 50; i++) {
      reportDegradedState(`embedding request failed with status ${400 + i}`, {
        route: "lib/services/embeddings",
        errorType: "embedding_request_failed",
      });
    }

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("reports distinct routes, error types and workspaces separately", () => {
    reportDegradedState("a", { route: "r1", errorType: "e1", workspaceId: "w1" });
    reportDegradedState("a", { route: "r1", errorType: "e1", workspaceId: "w2" });
    reportDegradedState("a", { route: "r2", errorType: "e1", workspaceId: "w1" });
    reportDegradedState("a", { route: "r1", errorType: "e2", workspaceId: "w1" });

    expect(warnSpy).toHaveBeenCalledTimes(4);
  });

  it("emits again once the cooldown window has elapsed", () => {
    vi.useFakeTimers();
    reportDegradedState("still broken", { route: "r1", errorType: "e1" });
    reportDegradedState("still broken", { route: "r1", errorType: "e1" });
    expect(warnSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    reportDegradedState("still broken", { route: "r1", errorType: "e1" });
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it("stays bounded when every event carries a distinct workspace", () => {
    // 6000 distinct keys against a 5000 cap: the map must evict rather than
    // grow without limit across a large tenant base.
    for (let i = 0; i < 6000; i++) {
      reportDegradedState("x", { route: "r", errorType: "e", workspaceId: `w${i}` });
    }
    expect(warnSpy).toHaveBeenCalledTimes(6000);
  });
});
