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

## Implementation Checklist

- [ ] Add discriminated-union contracts for any new runner or sync state.
- [ ] Add append-only event rows for long-running workflows before exposing UI automation.
- [ ] Add explicit `EffectResult`-style result contracts for disk/network/provider calls.
- [ ] Add error taxonomies for verifier/runner outcomes.
- [ ] Add auth-mode contracts before shipping local/on-prem client work.
- [ ] Add tests for impossible state rejection and exhaustive outcome handling.

