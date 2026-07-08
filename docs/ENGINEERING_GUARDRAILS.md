# NexusAI Engineering Guardrails

Updated: 2026-06-25

This note translates the FP-style review into practical Nexus engineering rules. The goal is not to make the codebase academic. The goal is to prevent invalid workflow, auth, runner, and sync states from reaching production.

Use these guardrails before building autonomous review loops, local/on-prem distribution, workflow-twin runners, connector sync jobs, or any long-running agent process.

---

## 1. Make Illegal States Unrepresentable

Prefer discriminated unions and Zod enum contracts over loose strings and optional bags of fields.

Good examples to preserve:
- `ingestionStatus`
- agent passport status
- workflow twin run status
- sensitivity classes

New state machines should model states explicitly:

```ts
type RunnerState =
  | { type: "idle" }
  | { type: "queued"; jobId: string }
  | { type: "executing"; jobId: string; startedAt: string }
  | { type: "evaluating"; jobId: string; outputId: string }
  | { type: "passed"; jobId: string; outputId: string }
  | { type: "failed"; jobId: string; reason: string; retryable: boolean };
```

Avoid state like:

```ts
{ status: string; jobId?: string; outputId?: string; error?: string }
```

That shape allows impossible combinations such as `status="passed"` without an output, or `status="executing"` with a final error.

---

## 2. Model Auth Modes Explicitly

Current hosted Mission Control uses Clerk as the browser auth provider. Future local/on-prem plans should not blur Clerk, local license, offline mode, and cloud sync into one loose auth flag.

Use an explicit auth-mode contract:

```ts
type AuthMode =
  | { type: "clerk_cloud"; workspaceId: string; orgId: string }
  | { type: "local_license"; workspaceId: string; licenseId: string; syncAllowed: false }
  | { type: "offline_local"; workspaceId: string; syncAllowed: false }
  | { type: "hybrid_sync_pending"; workspaceId: string; licenseId: string; syncAllowed: false };
```

Rules:
- Cloud sync is only allowed for a mode that explicitly permits it.
- Local-only sessions must not call cloud-sync APIs by accident.
- Hosted Clerk sessions and local license sessions should not share mutable global state.
- Any transition between auth modes should produce an audit event.

---

## 3. Prefer Append-Only Events Over Mutable Runtime Files

For multi-step workflows, do not coordinate state through mutable JSON files or in-memory globals when the result matters.

Use:
- database rows with atomic state transitions
- append-only audit events
- per-run event records
- immutable output history with rollback-by-pointer, not destructive overwrite

This matches the existing direction:
- `audit_events`
- `agent_outputs`
- `dispatch_jobs`
- `workflow_twin_runs`
- `learning_signals`

Future autonomous runners should add event records such as:
- `runner_queued`
- `runner_started`
- `tool_invocation_denied`
- `verification_passed`
- `verification_failed`
- `runner_timeout`
- `runner_oom`
- `runner_cancelled`

---

## 4. Make Async Effects Visible

Do not hide long-running or fire-and-forget effects behind APIs that look synchronous.

Good pattern:
1. user submits a command
2. API returns `jobId` or `runId`
3. background worker executes
4. status is visible through polling, event log, or output history
5. UI shows queued/running/retry/failed/passed states

Avoid:
- `delegate_task()` style calls that return success before the work is observable
- silent background errors
- hidden retries with no audit trail
- cloud sync methods that swallow disk/network failures

Any effect touching disk, network, external APIs, LLMs, source systems, or local vault sync should have a visible result contract:

```ts
type EffectResult<T> =
  | { ok: true; value: T }
  | { ok: false; errorType: "validation" | "permission" | "network" | "timeout" | "provider" | "storage" | "unknown"; message: string; retryable: boolean };
```

---

## 5. Use Exhaustive Error Taxonomies

Runner and verifier code should not collapse every failure into `failed`.

Use distinct outcomes:
- `passed`
- `user_fixable_failed`
- `system_error`
- `timeout`
- `oom`
- `permission_denied`
- `policy_denied`
- `provider_unavailable`
- `cancelled`

Every exhaustive switch should use an `assertNever` helper so new states fail compilation until handled.

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(value)}`);
}
```

This matters most for:
- workflow twin runs
- dispatch jobs
- connector sync jobs
- local vault sync
- future autonomous review loops
- local/on-prem runners

---

## 6. Apply These Rules First To These Areas

Priority order:

1. **Autonomous/workflow runners:** make run states explicit and append-only.
2. **Local/on-prem distribution:** model Clerk cloud, local license, offline, and sync-pending modes separately.
3. **Connector sync jobs:** expose queued/running/succeeded/skipped/failed states and source-specific failures.
4. **Knowledge vault sync:** return structured disk/network/conflict outcomes.
5. **Verifier/eval harness:** distinguish proof failure from system failure, timeout, OOM, and permission denial.

---

## 7. Keep The Production Build Green (Clerk client / Sentry / tracing / force-graph)

Established after commit `68a5a0b` (2026-07-09) "fix: unblock mission-control production build". The `next build` had been hanging locally before emitting any compile output. `tsc --noEmit` and the full Vitest suite were green the entire time, so the hang was a build/bundle-path problem, not a code-correctness one. Removing four things from the production build path fixed it (build now completes in ~40s).

Rules, in force for all new code:

1. **Do not import Clerk CLIENT components into page or component bundles.** `SignedIn`, `SignedOut`, `SignInButton`, `UserButton` and similar client widgets from `@clerk/nextjs` are banned from the build path. Server-side auth is unchanged and still required: keep using `auth()` in route handlers and `requireScope`/`resolveAuth` in APIs.
2. **Auth handoff is hosted.** Sign-in/sign-up go through the hosted Clerk URLs in env: `NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL`. To gate signed-out UI, render a plain `/sign-in` link, not `<SignedOut>`. Reference implementation: `app/reviewer-seat/accept/page.tsx`.
3. **New client pages should be fetch-only against server APIs.** Pages that only `fetch()` their data (for example `/reviewer-seat`, `/funnel`, `/pilot/afterlife`) are safe and were unaffected by the hang.
4. **Do not reintroduce, into the production build path:** Sentry runtime instrumentation, middleware request tracing, or client-side force-graph rendering, without confirming `next build` still completes.
5. **Verifying build health requires an actual build.** Tests + `tsc` passing is necessary but not sufficient — run `npm run build`, or let Render build in fresh CI. When a build hangs before compile output, suspect client-bundle/env triggers or stale `.next`/duplicate `route 2.ts`/`route 3.ts` files, not the source logic.

---

## Implementation Checklist

Contract layer landed 2026-06-25 in `apps/mission-control/lib/guardrails.ts` (tests: `tests/guardrails.test.ts`, 16 runtime assertions verified via tsx, tsc clean). These are the shared primitives; runners adopt them when written.

- [x] Add discriminated-union contracts for any new runner or sync state. (`RunnerState` + `runnerStateSchema`)
- [x] Add append-only event rows for long-running workflows before exposing UI automation. (`RunnerEvent` + `runnerEvent()` builder; persisted via existing audit/event stores)
- [x] Add explicit `EffectResult`-style result contracts for disk/network/provider calls. (`EffectResult<T>`, `ok()`/`err()`/`mapEffect()`/`runEffect()`)
- [x] Add error taxonomies for verifier/runner outcomes. (`VerifierOutcome` + `isRetryableOutcome`/`isUserActionable`)
- [x] Add auth-mode contracts before shipping local/on-prem client work. (`AuthMode` + `canSyncToCloud()` + `authModeTransitionEvent()`)
- [x] Add tests for impossible state rejection and exhaustive outcome handling. (`tests/guardrails.test.ts`)
- [ ] Before merging front-end work: no Clerk client components in bundles, hosted-Clerk envs used for auth handoff, and `npm run build` completes (see §7).

