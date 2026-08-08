# NexusAI Engineering Guardrails

Updated: 2026-07-15

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

1. **Keep Clerk client integration provider-only.** Root `app/layout.tsx` must retain `<ClerkProvider>` so one-minute browser session tokens refresh during long-lived navigation. `SignedIn`, `SignedOut`, `SignInButton`, `UserButton`, `OrganizationSwitcher`, and Clerk client auth hooks remain banned from page/component bundles unless a full production build proves the new boundary. Server-side auth is unchanged and still required: keep using `auth()` in route handlers and `requireScope`/`resolveAuth` in APIs.
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
- [ ] Before merging front-end work: root Clerk provider retained, no Clerk UI widgets/hooks in page bundles, hosted-Clerk envs used for auth handoff, and `npm run build` completes (see §7).

---

## 8. Build and Commit Safety Protocol

The July 2026 hang/recovery exposed three independent failure classes: expensive Next.js import/tracing paths, stale local dependency/cache state, and damaged Git index/ref state. Treat them as separate gates.

### Before staging

1. Work from the repository root with Node 24 (`nvm use`) for production parity. Node 22.12+ is retained only as a compatibility rung.
2. Run `npm run deps:check`. On a normal local/CI checkout, install with `npm ci` at the root. In this iCloud Drive checkout, use `npm run deps:repair` so dependencies live in the machine-local cache outside File Provider; do not reinstall a large `node_modules` tree into iCloud.
3. Run `npm run check:boundaries`.
4. Remove or move conflict-copy routes such as `page 2.tsx` and `route 2.ts`; untracked files under `app/` still enter the Next.js build.

### Before committing

1. Stage only the logical slice.
2. Run `npm run commit:check`.
3. Inspect `git diff --cached --stat` and `git diff --cached --name-status`.
4. Large commits over 250 files and suspicious mass deletions are blocked. Use `NEXUS_ALLOW_LARGE_COMMIT=1` only for a reviewed migration/recovery whose staged tree count is understood.
5. Install the repository hook once with `npm run hooks:install`.

### Before pushing/deploying

1. Run `npm run verify:release` for boundary check, typecheck, full tests, cache-clean production build, and per-phase timeouts.
2. A local filesystem stall is not a pass. The wrapper fails with process diagnostics rather than waiting indefinitely.
3. GitHub CI is the clean-environment authority. Render deployment starts only after CI is green.
4. Confirm the deployed commit SHA separately; `/api/health` proves dependencies, not release identity.

### Dependency layout rule

This is an npm workspace. A nested `apps/mission-control/node_modules/.pnpm` or `.modules.yaml` is a stale foreign install and must not remain. It can shadow root dependencies and make TypeScript/build behavior non-deterministic.

In an iCloud/File Provider checkout, a normal-looking dependency file may be only a remote metadata stub (`compressed,dataless`). Concurrent npm/Vite reads can then exhaust libuv's filesystem worker pool and leave the process asleep in kernel `read()` with no test output. `scripts/file-provider-deps.mjs` prevents this failure class by:

- requiring Node 24 primary or Node 22.12+ compatibility while rejecting EOL and non-LTS majors;
- failing fast on dataless root dependencies or nested workspace installs;
- installing the lockfile-defined tree under a Node-major-specific path in `~/.cache/nexus-core-deps/`;
- rejecting an external cache created by a different Node major;
- preserving npm's locked workspace-local dependency layer through managed external symlinks and validating every direct workspace dependency version;
- allowing normal npm-created workspace-local dependencies in CI/Render while continuing to reject pnpm markers and unmanaged File Provider cache links;
- serializing multi-agent repair through a stale-aware lock;
- symlinking root `node_modules` to the hydrated external tree;
- keeping Vitest cache data under `~/.cache/nexus-core/` rather than `apps/mission-control/node_modules/.vite`.

## 9. Migrations Run Before Promotion: Every Migration Must Be Backward Compatible

`render.yaml` runs `npm run db:migrate` in `preDeployCommand` (changed
2026-08-08, when the web service moved from `plan: free` to `plan: starter`).
Migrations therefore run after the build succeeds, before the new version takes
traffic, and not at all if the build fails. A failing migration now aborts the
deploy and leaves the current release serving.

**This narrowed the window. It did not close it.** Between the migration
completing and the new version taking traffic, the OLD release is still serving
against the NEW schema. The rule below is unchanged and still mandatory. What
changed is that the exposure is now seconds rather than open-ended, and a build
failure can no longer leave the database a release ahead of the application.

Until 2026-08-08 `db:migrate` ran inside `buildCommand`, so migrations reached
the production database whether or not the deploy ever promoted. That is the
failure below, kept here because it is the reason the rule exists.

This is not hypothetical. Observed 2026-08-05: migrations 0043 and 0044 were
recorded in `_nexus_migrations` while `https://pinavia.io` was still serving a
build that predated both — `/evidence/review` returned 404 and `/api/health`
carried no `build` field. A local `npm run db:migrate` printed `skip` for every
file, which is the runner correctly reporting that the ids were already
present. The database was a release ahead of the application, and nothing was
broken only because the new columns were nullable and the old code ignored
them. That was luck, not design.

**The rule.** A migration must leave the CURRENTLY DEPLOYED release working. At
the moment a migration lands, the code that will use it may not be running, and
may never run if the deploy fails. Write every schema change so both the old
and the new release are correct against it.

Practically, this means expand and contract as two separate deploys:

- Adding a column: nullable, or with a default. Never `NOT NULL` without a
  default in the same migration that introduces it.
- Removing a column: ship the code that stops reading it first, then drop it in
  a later release. Never in the same one.
- Renaming: add the new name, backfill, migrate readers, drop the old name.
  Three steps, never one.
- Changing a type or tightening a constraint: only after every running release
  already satisfies it.
- Adding a table or index: safe. These are additive by nature.

**Verify the pairing, do not assume it.** `_nexus_migrations` records that a
migration ran, not that the schema matches the running code. `/api/health`
reports `build.commitShort`; compare it against the commit whose migrations you
expect to be applied before treating a deploy as complete.

**Why the rule survives the `preDeployCommand` move.** It is tempting to read
"migrations now run just before promotion" as "the old release never sees the
new schema". It does, for the length of the cutover. Any migration that would
break the currently deployed release still breaks it, just for a shorter time
and in a way that is harder to notice. Expand and contract as separate deploys
remains the only safe pattern here.

## 10. Triage Lint Warnings; Never Bulk-Fix And Never Bulk-Ignore

A build log full of yellow triangles trains everyone to stop reading it. That
is the actual danger: not the warnings, but the habit of scrolling past them.

On 2026-08-06 the deployed build carried 15 warnings. Reading each one
individually found **one live defect, two false alarms, and twelve entries that
should never go away**. Both bulk responses — "fix them all" and "turn the rule
off" — would have been wrong, and the bulk-fix would have introduced a fetch
loop.

### 10.1 Every `react-hooks/exhaustive-deps` warning is one of three things

Decide WHICH before touching it. Adding the missing dependency is correct in
only one of the three cases.

**(a) A real stale closure. Fix it.**

`components/ingestion-upload.tsx` had:

```ts
const handleDrop = useCallback((e) => { ...; pickFiles(e.dataTransfer.files); }, []);
```

`pickFiles` is redefined every render and closes over `files`. The empty
dependency array froze the FIRST render's copy, so every drop ran against
`files === []`: the duplicate check compared against an empty list, and
`MAX_FILES - files.length` was always `MAX_FILES`. Drag-and-drop accepted
duplicates and ignored the ten-file cap.

Two things hid it, and both are the general pattern:

- `setFiles` used the functional form, so files still accumulated correctly.
  The visible behaviour was right; only the *guards* were dead.
- The sibling path, `<input onChange={(e) => pickFiles(e.target.files)}>`, uses
  an inline arrow recreated each render, so the file picker was always correct.
  **One path worked and one did not**, which is why nobody noticed.

The fix was to delete the `useCallback`, not to add `files` to it. The handler
was attached to a non-memoised element, so memoising it bought nothing and cost
a bug.

**(b) A deliberate run-once effect. Suppress it, with the reason written down.**

```ts
useEffect(() => { load(); }, []);
```

`load` is redefined each render and calls `setState`. Adding it as a dependency
makes the effect re-run after every load: a fetch loop. Here the rule is simply
wrong about the intent. Use
`// eslint-disable-next-line react-hooks/exhaustive-deps` **with a comment
saying why**. A bare disable is indistinguishable from giving up.

**(c) An unstable identity for a value that is actually constant. Remove the
cause.**

`const sectors = getAllSectors()` inside a component returns a fresh array
every render from a static module table. Nothing misbehaved, but the warning
was accurate. Hoisting it to module scope resolved it properly. Prefer this
over suppression whenever the value genuinely never changes — it is the only
one of the three where the warning disappears because the code got better.

### 10.2 A rule set to `warn` on purpose must say so in the config

`@next/next/no-html-link-for-pages` fires nine times and every one is intended:
`CLAUDE.md` §"Production Build Constraints" requires signed-out UI to be gated
with a plain `<a href="/sign-in">` rather than Clerk client components, because
the hosted-Clerk handoff depends on a hard navigation for session pickup.
`next/link` would break it.

The rule is `warn` rather than `off` so an *accidental* `<a>` still surfaces in
review. That trade-off is written in `eslint.config.mjs` next to the rule.

**Whenever you downgrade or disable a rule, the reason goes beside it.** A
future agent reading nine identical warnings will otherwise "fix" them and
break authentication — the exact failure this section exists to prevent.

### 10.3 Warnings are not errors, and saying so is part of the report

`next build` prints warnings with the same yellow triangle whether they are
cosmetic or a live bug, and Render's log viewer makes a handful look like a
wall. Before escalating, run `npx eslint .` and read the summary line. "15
problems (0 errors, 15 warnings)" is a different conversation from a failing
build, and conflating them wastes a cycle.

Reconcile the count. If local and CI disagree, that difference is itself the
finding — do not start fixing until they agree.

### 10.4 The standing rule

Treat the warning count as a budget that only moves for a stated reason. Each
remaining warning should be explainable in one sentence by whoever last touched
it. Twelve explainable warnings beat zero warnings achieved by disabling rules,
and both beat fifteen nobody has read.
