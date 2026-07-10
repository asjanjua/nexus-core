# Errors

Command failures and integration errors.

---

## [ERR-20260710-001] git-lock-and-index-recovery

**Logged**: 2026-07-10T14:15:00+05:00
**Priority**: critical
**Status**: resolved
**Area**: infra

### Summary
Stale Git locks and an invalid remote ref blocked staging and produced an incomplete repository tree commit.

### Error

`git add` could not create `index.lock`; `git commit` could not create `HEAD.lock`; the current commit tree contained only 13 files while its parent contained 594.

### Context
- Ownerless zero-byte lock files remained after interrupted Git operations.
- An invalid `refs/remotes/origin/main 2` ref caused `git fsck` errors.
- The index staged nearly the full repository as additions after the incomplete commit.

### Suggested Fix
Preserve stale locks and malformed refs outside `.git/refs`, compare staged tree size to `HEAD`, recover the full tree in a dedicated commit, and block suspicious tree shrink in pre-commit checks.

### Metadata
- Reproducible: yes
- Related Files: scripts/preflight-commit.mjs

### Resolution
- **Resolved**: 2026-07-10T14:15:00+05:00
- **Commit/PR**: 37af988
- **Notes**: Restored the repository to a 597-file tree and preserved recovery artifacts under `.git/recovery-2026-07-10`.

---

## [ERR-20260710-002] local-typescript-read-stall

**Logged**: 2026-07-10T14:15:00+05:00
**Priority**: high
**Status**: mitigated
**Area**: infra

### Summary
Local TypeScript processes intermittently sleep in synchronous filesystem reads with no compiler output.

### Error

`tsc --noEmit` remained at zero CPU and did not exit, even after stale nested dependencies and generated caches were moved out of the project.

### Context
- Vitest completed successfully.
- Process sampling showed the compiler blocked in a kernel `read` call on declaration files that other processes could read immediately.
- The behavior occurred with both the default Node runtime and Node 20.

### Suggested Fix
Use a timed verification wrapper with phase-level progress and diagnostics. Treat clean GitHub CI as authoritative when the local filesystem runner stalls.

### Metadata
- Reproducible: intermittent
- Related Files: scripts/verify-build.mjs, .github/workflows/ci.yml

---

## [ERR-20260710-003] root-tsc-without-project

**Logged**: 2026-07-10T19:00:00+05:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Running `npx tsc --noEmit` from the monorepo root printed TypeScript help because the root has no `tsconfig.json`.

### Error

The compiler exited with code 1 after displaying its command reference instead of checking Mission Control.

### Context
- The application TypeScript project is under `apps/mission-control`.
- The root package delegates workspace commands but does not define a root TypeScript project.

### Suggested Fix
Run `npx tsc --noEmit -p apps/mission-control/tsconfig.json` from the repository root, or run the compiler from `apps/mission-control`.

### Metadata
- Reproducible: yes
- Related Files: apps/mission-control/tsconfig.json, AGENTS.md

### Resolution
- **Resolved**: 2026-07-10T19:00:00+05:00
- **Notes**: Verification rerun with the explicit application project path.

---

## [ERR-20260710-004] next-build-bundled-fsevents

**Logged**: 2026-07-10T19:02:00+05:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
The production build attempted to parse Chokidar's optional native `fsevents.node` binary through the local vault-sync import graph.

### Error

Webpack reported `Module parse failed: Unexpected character` for `node_modules/fsevents/fsevents.node`.

### Context
- `vault-sync.ts` dynamically loads Chokidar only for the optional local filesystem watcher.
- The module is reachable from Knowledge API routes, so Next.js still included its dependency graph in the server bundle.

### Suggested Fix
Treat `chokidar` and `fsevents` as Next.js server external packages so Node resolves them only when the watcher is enabled.

### Metadata
- Reproducible: yes
- Related Files: apps/mission-control/lib/services/vault-sync.ts, apps/mission-control/next.config.mjs

### Resolution
- **Resolved**: 2026-07-10T19:02:00+05:00
- **Notes**: Added both packages to `serverExternalPackages`; production build rerun required.

---

## [ERR-20260710-005] relay-rewrote-handover-history

**Logged**: 2026-07-10T19:05:00+05:00
**Priority**: high
**Status**: resolved
**Area**: docs

### Summary
`relay.py` replaced the long-form handoff history with a short generated handoff instead of appending the new session.

### Error

The resulting diff removed more than 1,100 lines from `HANDOVER.md`.

### Context
- The repository requires the handoff file to preserve prior session history.
- The broad rewrite was detected by the final diff-stat review before handoff.

### Suggested Fix
Inspect the handoff diff immediately after using `relay.py`; for this repository, append a concise dated section with `apply_patch` when the helper would replace history.

### Metadata
- Reproducible: unknown
- Related Files: relay.py, HANDOVER.md

### Resolution
- **Resolved**: 2026-07-10T19:05:00+05:00
- **Notes**: Restored the tracked handoff history and appended the verified session summary without the destructive rewrite.

---
