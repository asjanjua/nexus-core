# Agent Run: vitest-collection-stall-root-cause

- **Started:** 2026-07-15T21:52:29+05:00
- **Agent:** codex
- **Branch:** `main`
- **Starting HEAD:** `7401e409dfa358b024e1b2e64869fb3af7197af8`
- **Status:** `locally_verified`

## Objective

Find and repair the Mission Control Vitest collection stall so the normal root npm test command completes reliably.

## Acceptance Criteria

- [x] Identify the blocking operation with process-level evidence.
- [x] Fix the root cause without weakening test coverage or timeouts.
- [x] A representative single test and the full 70-file Mission Control suite complete.
- [x] The root npm test command completes relay and Mission Control suites.
- [x] Document failure, fix, verification, and recovery behavior.

## Claimed Files

- `package.json`
- `apps/mission-control/package.json`
- `apps/mission-control/vitest.config.ts`
- `apps/mission-control/tests`
- `scripts/file-provider-deps.mjs`
- `AGENTS.md`
- `CLAUDE.md`
- `.learnings/ERRORS.md`

## Starting Worktree State

```text
M .learnings/ERRORS.md
 M AGENTS.md
 M BACKLOG.md
 M CHANGELOG.md
 M CLAUDE.md
 M HANDOVER.md
 M TASKS.md
 M package.json
 M relay.py
?? .agents/
?? docs/agent-runs/
?? tests/
```

## Checkpoints

### 2026-07-15T21:52:29+05:00 — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.

### 2026-07-15T21:57:40+05:00 — root cause proven before edits

- **Completed:** Reproduced the freeze with both Vitest and plain `npm ls`, sampled the blocked npm process, inspected open files and File Provider state, and checked supported remediation commands.
- **Verification:** The process sample showed four libuv filesystem workers blocked in kernel `read()`. The repo is inside `com.apple.CloudDocs.iCloudDriveFileProvider`; 68,605 of 69,007 dependency files are `compressed,dataless`. `fileproviderctl` reports `node_modules` is not pinned or recursively downloaded. Apple documents that dataless content is remote-only until materialized and that materialization can take time.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not applicable; local dependency/runtime failure.
- **Blockers:** Finder exposes Keep Downloaded, but this macOS `fileproviderctl` has no supported command-line download/pin action; `.nosync` is not excluded by the active provider.
- **Next exact action:** Implement a Node-20-only external dependency cache repair command plus a fast-fail dependency health check, then replace the dataless tree and rerun one-file/full tests.

### 2026-07-15T22:01:55+05:00 — external dependencies repaired; cache-location defect found

- **Completed:** Installed 512 locked packages in 18 seconds under `~/.cache/nexus-core-deps`, replaced repository `node_modules` with a symlink, removed the old nested cache, and added Node/hydration/nested-state preflight checks.
- **Verification:** `npm ls` changed from an indefinite kernel-read sleep to exit 0 in 0.7 seconds. `tests/agent-skills.test.ts` completed 22/22 in 319 ms. The external dependency target contains zero dataless files.
- **Failure:** Vitest's default cache location recreated `apps/mission-control/node_modules/.vite`; the next root run passed all six relay tests, then the new guard rejected that nested directory before Vitest. This is a guard/config integration defect, not a test failure or renewed stall.
- **Recovery:** Configure Vite/Vitest cache under `~/.cache/nexus-core/vite-mission-control`, remove the generated nested cache, and rerun the unchanged root command.
- **Next exact action:** Verify the cache remains outside the workspace and complete all 70 files through root `npm test`.

### 2026-07-15T22:06:04+05:00 — root cause fixed and full release gates passed

- **Completed:** Moved Vitest cache outside iCloud, added root/workspace preflight hooks, hardened repair with a stale-aware multi-agent lock, promoted the recovery path into agent instructions and engineering guardrails, and reconciled central paperwork.
- **Verification:** Node 20.20.2. `npm run deps:repair` reused the hydrated cache successfully. `npm test` passed 6 relay tests and 70 Mission Control files / 478 assertions in 3.01 seconds. `npm run check:boundaries` passed. Standalone TypeScript passed in under six seconds. `NEXT_TELEMETRY_DISABLED=1 npm run build` compiled in 14.7 seconds and completed all 163 static pages. No worker, timeout, or coverage setting was weakened.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not applicable; local developer-tooling repair.
- **Blockers:** None for local test/build execution. CI has not run and no deployment was attempted.
- **Next exact action:** Review the uncommitted tooling/paperwork slice and publish through `nexus-commit-and-pr` only if authorized.

### 2026-07-15T22:07:49+05:00 — final hygiene review complete

- **Completed:** Confirmed the machine-specific dependency symlink is ignored by Git, made the repair script executable, and reviewed the final config/tooling diff. The ignore rule now covers both dependency directories and symlinks.
- **Verification:** `npm run deps:check`, Node syntax check, and full unscoped `git diff --check` passed. The Vitest cache exists only under the local cache root; `apps/mission-control/node_modules` remains absent.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not applicable.
- **Blockers:** None locally. CI/deployment remain not run.
- **Next exact action:** Record the final append-only handoff, then return the locally verified result to the user.
