/**
 * Engineering Guardrails — shared runtime contracts.
 *
 * Implements docs/ENGINEERING_GUARDRAILS.md as enforceable code. These are the
 * foundational primitives that ALL future autonomous runners, local/on-prem
 * clients, connector sync jobs, and verifier loops must build on, so that
 * invalid runner/auth/sync/verifier states cannot reach production.
 *
 * Nothing here is wired into a live runner yet — by design. The doc is explicit
 * that these contracts must exist *before* autonomous loops are built. This
 * module is the contract layer; runners adopt it when they are written.
 *
 * Five rules, in code:
 *   1. Make illegal states unrepresentable  -> discriminated unions (RunnerState, AuthMode)
 *   2. Model auth modes explicitly          -> AuthMode + canSyncToCloud + authModeTransitionEvent
 *   3. Prefer append-only events            -> RunnerEvent + runnerEvent() builder
 *   4. Make async effects visible           -> EffectResult<T> + ok()/err()/mapEffect()
 *   5. Use exhaustive error taxonomies      -> VerifierOutcome + assertNever
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Rule 5 substrate: exhaustiveness helper
// ---------------------------------------------------------------------------

/**
 * Compile-time exhaustiveness guard. Place in the `default` branch of a switch
 * over a discriminated union so that adding a new variant fails type-checking
 * until every consumer handles it. Throws at runtime if reached via untyped data.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled guardrail state: ${JSON.stringify(value)}`);
}

// ---------------------------------------------------------------------------
// Rule 4: EffectResult — make async/IO effects visible and typed
// ---------------------------------------------------------------------------

export const effectErrorTypeSchema = z.enum([
  "validation",
  "permission",
  "network",
  "timeout",
  "provider",
  "storage",
  "conflict",
  "cancelled",
  "unknown",
]);
export type EffectErrorType = z.infer<typeof effectErrorTypeSchema>;

export type EffectResult<T> =
  | { ok: true; value: T }
  | { ok: false; errorType: EffectErrorType; message: string; retryable: boolean };

/** Construct a successful effect result. */
export function ok<T>(value: T): EffectResult<T> {
  return { ok: true, value };
}

/** Construct a failed effect result. `retryable` defaults from the error type. */
export function err(
  errorType: EffectErrorType,
  message: string,
  retryable: boolean = defaultRetryable(errorType),
): EffectResult<never> {
  return { ok: false, errorType, message, retryable };
}

/** Sensible default for whether an error class is worth retrying. */
export function defaultRetryable(errorType: EffectErrorType): boolean {
  switch (errorType) {
    case "network":
    case "timeout":
    case "provider":
    case "storage":
      return true;
    case "validation":
    case "permission":
    case "conflict":
    case "cancelled":
    case "unknown":
      return false;
    default:
      return assertNever(errorType);
  }
}

/** Transform the success value of an effect result, preserving failures. */
export function mapEffect<T, U>(
  result: EffectResult<T>,
  fn: (value: T) => U,
): EffectResult<U> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Wrap a promise so disk/network/provider failures become typed results instead
 * of thrown exceptions that callers can silently swallow. Async effects stay visible.
 */
export async function runEffect<T>(
  fn: () => Promise<T>,
  classify: (error: unknown) => EffectErrorType = () => "unknown",
): Promise<EffectResult<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(classify(error), message);
  }
}

// ---------------------------------------------------------------------------
// Rule 5: Verifier / runner outcome taxonomy
// ---------------------------------------------------------------------------

export const verifierOutcomeSchema = z.enum([
  "passed",
  "user_fixable_failed",
  "system_error",
  "timeout",
  "oom",
  "permission_denied",
  "policy_denied",
  "provider_unavailable",
  "cancelled",
]);
export type VerifierOutcome = z.infer<typeof verifierOutcomeSchema>;

/**
 * Whether a verifier outcome should be auto-retried by a runner. Uses an
 * exhaustive switch so a new outcome forces an explicit retry decision.
 */
export function isRetryableOutcome(outcome: VerifierOutcome): boolean {
  switch (outcome) {
    case "system_error":
    case "timeout":
    case "provider_unavailable":
      return true;
    case "passed":
    case "user_fixable_failed":
    case "oom":
    case "permission_denied":
    case "policy_denied":
    case "cancelled":
      return false;
    default:
      return assertNever(outcome);
  }
}

/** Whether an outcome represents work the user can fix and resubmit. */
export function isUserActionable(outcome: VerifierOutcome): boolean {
  switch (outcome) {
    case "user_fixable_failed":
    case "permission_denied":
    case "policy_denied":
      return true;
    case "passed":
    case "system_error":
    case "timeout":
    case "oom":
    case "provider_unavailable":
    case "cancelled":
      return false;
    default:
      return assertNever(outcome);
  }
}

// ---------------------------------------------------------------------------
// Rule 1: Runner state machine — illegal states unrepresentable
// ---------------------------------------------------------------------------

/**
 * Explicit runner lifecycle. Each state carries exactly the fields valid for it,
 * so impossible shapes (e.g. "passed" with no outputId, "failed" with no reason)
 * cannot be constructed. Replaces loose `{ status: string; ...optional }` bags.
 */
export type RunnerState =
  | { type: "idle" }
  | { type: "queued"; jobId: string }
  | { type: "executing"; jobId: string; startedAt: string }
  | { type: "evaluating"; jobId: string; outputId: string }
  | { type: "passed"; jobId: string; outputId: string }
  | { type: "failed"; jobId: string; outcome: VerifierOutcome; reason: string; retryable: boolean };

export const runnerStateSchema: z.ZodType<RunnerState> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("idle") }),
  z.object({ type: z.literal("queued"), jobId: z.string().min(1) }),
  z.object({ type: z.literal("executing"), jobId: z.string().min(1), startedAt: z.string().min(1) }),
  z.object({ type: z.literal("evaluating"), jobId: z.string().min(1), outputId: z.string().min(1) }),
  z.object({ type: z.literal("passed"), jobId: z.string().min(1), outputId: z.string().min(1) }),
  z.object({
    type: z.literal("failed"),
    jobId: z.string().min(1),
    outcome: verifierOutcomeSchema,
    reason: z.string().min(1),
    retryable: z.boolean(),
  }),
]) as z.ZodType<RunnerState>;

/** A runner state is terminal when no further automatic transition is expected. */
export function isTerminalRunnerState(state: RunnerState): boolean {
  switch (state.type) {
    case "passed":
      return true;
    case "failed":
      return !state.retryable;
    case "idle":
    case "queued":
    case "executing":
    case "evaluating":
      return false;
    default:
      return assertNever(state);
  }
}

// ---------------------------------------------------------------------------
// Rule 3: Append-only runner events
// ---------------------------------------------------------------------------

export const runnerEventTypeSchema = z.enum([
  "runner_queued",
  "runner_started",
  "tool_invocation_denied",
  "verification_passed",
  "verification_failed",
  "runner_timeout",
  "runner_oom",
  "runner_cancelled",
]);
export type RunnerEventType = z.infer<typeof runnerEventTypeSchema>;

export const runnerEventSchema = z.object({
  type: runnerEventTypeSchema,
  workspaceId: z.string().min(1),
  jobId: z.string().min(1),
  at: z.string().min(1),
  outcome: verifierOutcomeSchema.nullable().optional(),
  detail: z.string().nullable().optional(),
});
export type RunnerEvent = z.infer<typeof runnerEventSchema>;

/** Build an append-only runner event row. Timestamp defaults to now (ISO). */
export function runnerEvent(input: {
  type: RunnerEventType;
  workspaceId: string;
  jobId: string;
  outcome?: VerifierOutcome | null;
  detail?: string | null;
  at?: string;
}): RunnerEvent {
  return runnerEventSchema.parse({
    type: input.type,
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    at: input.at ?? new Date().toISOString(),
    outcome: input.outcome ?? null,
    detail: input.detail ?? null,
  });
}

// ---------------------------------------------------------------------------
// Rule 2: Auth modes — explicit, with sync permission encoded in the type
// ---------------------------------------------------------------------------

/**
 * Mirrors lib/mode-context.tsx's deploy modes but as an auth contract: only a
 * mode that explicitly permits it may call cloud-sync APIs. Local/offline
 * sessions carry `syncAllowed: false` in the type itself.
 */
export type AuthMode =
  | { type: "clerk_cloud"; workspaceId: string; orgId: string }
  | { type: "local_license"; workspaceId: string; licenseId: string; syncAllowed: false }
  | { type: "offline_local"; workspaceId: string; syncAllowed: false }
  | { type: "hybrid_sync_pending"; workspaceId: string; licenseId: string; syncAllowed: false };

export const authModeSchema: z.ZodType<AuthMode> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("clerk_cloud"), workspaceId: z.string().min(1), orgId: z.string().min(1) }),
  z.object({
    type: z.literal("local_license"),
    workspaceId: z.string().min(1),
    licenseId: z.string().min(1),
    syncAllowed: z.literal(false),
  }),
  z.object({ type: z.literal("offline_local"), workspaceId: z.string().min(1), syncAllowed: z.literal(false) }),
  z.object({
    type: z.literal("hybrid_sync_pending"),
    workspaceId: z.string().min(1),
    licenseId: z.string().min(1),
    syncAllowed: z.literal(false),
  }),
]) as z.ZodType<AuthMode>;

/**
 * The single gate for cloud sync. Only hosted Clerk sessions may sync. Every
 * other mode is local-first and must not reach cloud-sync APIs by accident.
 */
export function canSyncToCloud(mode: AuthMode): boolean {
  switch (mode.type) {
    case "clerk_cloud":
      return true;
    case "local_license":
    case "offline_local":
    case "hybrid_sync_pending":
      return false;
    default:
      return assertNever(mode);
  }
}

/**
 * Any transition between auth modes must produce an audit event (Rule 2).
 * Returns the event payload to append; callers persist it via the audit store.
 */
export function authModeTransitionEvent(
  from: AuthMode,
  to: AuthMode,
  at: string = new Date().toISOString(),
): { kind: "auth_mode_transition"; workspaceId: string; from: AuthMode["type"]; to: AuthMode["type"]; at: string } {
  return {
    kind: "auth_mode_transition",
    workspaceId: to.workspaceId,
    from: from.type,
    to: to.type,
    at,
  };
}
