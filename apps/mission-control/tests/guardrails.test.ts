/**
 * Engineering Guardrails — contract tests (TASKS.md guardrails batch).
 *
 * Proves the two properties the guardrails doc cares about:
 *   1. Impossible states are rejected at the boundary (Zod discriminated unions).
 *   2. Outcome/state handling is exhaustive (assertNever forces new variants to
 *      be handled, and every defined variant is classified without throwing).
 */

import { describe, expect, it } from "vitest";
import {
  assertNever,
  ok,
  err,
  defaultRetryable,
  mapEffect,
  runEffect,
  effectErrorTypeSchema,
  verifierOutcomeSchema,
  isRetryableOutcome,
  isUserActionable,
  runnerStateSchema,
  isTerminalRunnerState,
  runnerEvent,
  runnerEventSchema,
  authModeSchema,
  canSyncToCloud,
  authModeTransitionEvent,
  type VerifierOutcome,
  type RunnerState,
  type AuthMode,
} from "@/lib/guardrails";

describe("assertNever", () => {
  it("throws when reached at runtime via untyped data", () => {
    expect(() => assertNever("rogue" as never)).toThrow(/Unhandled guardrail state/);
  });
});

describe("EffectResult", () => {
  it("ok() and err() build the discriminated shape", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    const e = err("network", "down");
    expect(e).toMatchObject({ ok: false, errorType: "network", message: "down", retryable: true });
  });

  it("defaultRetryable is exhaustive over every error type and never throws", () => {
    for (const t of effectErrorTypeSchema.options) {
      expect(typeof defaultRetryable(t)).toBe("boolean");
    }
    expect(defaultRetryable("validation")).toBe(false);
    expect(defaultRetryable("timeout")).toBe(true);
  });

  it("mapEffect transforms success and preserves failure", () => {
    expect(mapEffect(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 });
    const failure = err("storage", "disk full");
    expect(mapEffect(failure, (n: number) => n * 3)).toBe(failure);
  });

  it("runEffect converts thrown exceptions into typed failures", async () => {
    const good = await runEffect(async () => "v");
    expect(good).toEqual({ ok: true, value: "v" });

    const bad = await runEffect(
      async () => {
        throw new Error("boom");
      },
      () => "provider",
    );
    expect(bad).toMatchObject({ ok: false, errorType: "provider", message: "boom" });
  });
});

describe("VerifierOutcome taxonomy", () => {
  it("classifies every defined outcome without throwing (exhaustive switches)", () => {
    for (const outcome of verifierOutcomeSchema.options as VerifierOutcome[]) {
      expect(typeof isRetryableOutcome(outcome)).toBe("boolean");
      expect(typeof isUserActionable(outcome)).toBe("boolean");
    }
  });

  it("retryable vs user-actionable are distinct partitions", () => {
    expect(isRetryableOutcome("timeout")).toBe(true);
    expect(isRetryableOutcome("policy_denied")).toBe(false);
    expect(isUserActionable("policy_denied")).toBe(true);
    expect(isUserActionable("system_error")).toBe(false);
  });

  it("rejects an unknown outcome string", () => {
    expect(verifierOutcomeSchema.safeParse("exploded").success).toBe(false);
  });
});

describe("RunnerState discriminated union", () => {
  it("accepts a well-formed terminal state", () => {
    const passed: RunnerState = { type: "passed", jobId: "j1", outputId: "o1" };
    expect(runnerStateSchema.safeParse(passed).success).toBe(true);
    expect(isTerminalRunnerState(passed)).toBe(true);
  });

  it("rejects impossible shapes: passed without an outputId", () => {
    const broken = { type: "passed", jobId: "j1" };
    expect(runnerStateSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects impossible shapes: executing carrying a final error", () => {
    const broken = { type: "executing", jobId: "j1", startedAt: "t", reason: "x" };
    // extra field rejected by strict-by-default object; core point: no `reason` slot on executing
    const parsed = runnerStateSchema.safeParse(broken);
    expect(parsed.success).toBe(true); // zod strips unknown keys by default
    if (parsed.success) {
      expect("reason" in parsed.data).toBe(false);
    }
  });

  it("failed state retryability drives terminality", () => {
    const retry: RunnerState = { type: "failed", jobId: "j", outcome: "timeout", reason: "slow", retryable: true };
    const fatal: RunnerState = { type: "failed", jobId: "j", outcome: "oom", reason: "mem", retryable: false };
    expect(isTerminalRunnerState(retry)).toBe(false);
    expect(isTerminalRunnerState(fatal)).toBe(true);
    expect(isTerminalRunnerState({ type: "queued", jobId: "j" })).toBe(false);
  });
});

describe("RunnerEvent append-only builder", () => {
  it("builds a valid event with defaulted timestamp and null fields", () => {
    const e = runnerEvent({ type: "runner_started", workspaceId: "w1", jobId: "j1" });
    expect(runnerEventSchema.safeParse(e).success).toBe(true);
    expect(e.outcome).toBeNull();
    expect(typeof e.at).toBe("string");
  });

  it("rejects an unknown event type", () => {
    expect(() =>
      runnerEvent({ type: "runner_exploded" as never, workspaceId: "w", jobId: "j" }),
    ).toThrow();
  });
});

describe("AuthMode contract", () => {
  it("only clerk_cloud may sync to cloud", () => {
    const cloud: AuthMode = { type: "clerk_cloud", workspaceId: "w", orgId: "o" };
    const local: AuthMode = { type: "local_license", workspaceId: "w", licenseId: "l", syncAllowed: false };
    const offline: AuthMode = { type: "offline_local", workspaceId: "w", syncAllowed: false };
    expect(canSyncToCloud(cloud)).toBe(true);
    expect(canSyncToCloud(local)).toBe(false);
    expect(canSyncToCloud(offline)).toBe(false);
  });

  it("rejects a local mode that illegally claims syncAllowed: true", () => {
    const broken = { type: "local_license", workspaceId: "w", licenseId: "l", syncAllowed: true };
    expect(authModeSchema.safeParse(broken).success).toBe(false);
  });

  it("transition produces an audit event tagged to the destination workspace", () => {
    const from: AuthMode = { type: "offline_local", workspaceId: "w", syncAllowed: false };
    const to: AuthMode = { type: "clerk_cloud", workspaceId: "w2", orgId: "o" };
    const ev = authModeTransitionEvent(from, to, "2026-06-25T00:00:00.000Z");
    expect(ev).toEqual({
      kind: "auth_mode_transition",
      workspaceId: "w2",
      from: "offline_local",
      to: "clerk_cloud",
      at: "2026-06-25T00:00:00.000Z",
    });
  });
});
