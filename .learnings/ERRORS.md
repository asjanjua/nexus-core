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
- Recurrence-Count: 3
- Last-Seen: 2026-07-14
- See Also: verification runs on Node 22.22.3 and Node 20.20.2 both timed out in the TypeScript phase after the boundary check passed; rely on clean GitHub CI before claiming a green release gate

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
- **Notes**: Restored the tracked handoff history and appended the verified session summary without the destructive rewrite. Permanent repair landed locally on 2026-07-15: `relay.py` now uses locked exact-prefix appends with duplicate protection and `tests/test_relay.py` pins the behavior.

---

## [ERR-20260714-006] skill-validator-missing-pyyaml

**Logged**: 2026-07-14T17:20:00+05:00
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
The official skill quick validator could not start because the shell Python runtime does not include PyYAML.

### Error

`ModuleNotFoundError: No module named 'yaml'`

### Context
- Command: `python3 .../skill-creator/scripts/quick_validate.py <skill-folder>`
- The generated skill files were created successfully; validation did not run.

### Suggested Fix
Use the bundled workspace Python environment that includes PyYAML, or install the validator dependency in an isolated tool environment without changing Nexus runtime dependencies.

### Metadata
- Reproducible: yes
- Related Files: .agents/skills

### Resolution
- **Resolved**: 2026-07-14T17:23:00+05:00
- **Notes**: Ran the official validator with `PYTHONPATH` pointed at the existing PyYAML installation in the Homebrew PyTorch tool environment; both top-level skills validated.

---

## [ERR-20260714-007] central-paperwork-patch-context

**Logged**: 2026-07-14T17:55:00+05:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
A multi-file paperwork patch was rejected because it assumed a boilerplate line that is not present in `CHANGELOG.md`.

### Error

`apply_patch verification failed: Failed to find expected lines in CHANGELOG.md`

### Context
- No partial changes were applied.
- The repository's changelog begins with a divider immediately after the title.

### Suggested Fix
Re-read each central document and apply small file-specific patches against exact current context.

### Metadata
- Reproducible: yes
- Related Files: CHANGELOG.md, HANDOVER.md, TASKS.md, BACKLOG.md

### Resolution
- **Resolved**: 2026-07-14T17:56:00+05:00
- **Notes**: Re-read the live file headers and split the update into narrow patches.

---

## [ERR-20260715-008] npm-vitest-silent-sleep

**Logged**: 2026-07-15T20:35:04+05:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
The Mission Control Vitest process entered a silent sleep while running through the root `npm test` command.

### Error

The process produced no test output for more than two minutes, showed `0.0%` CPU in `ps`, and required an interrupt (`exit 130`).

### Context
- Command: `PATH=/opt/homebrew/Cellar/node@20/20.20.2/bin:$PATH npm test`
- The six relay regression tests completed successfully before Vitest started.
- The sleeping process was `node .../node_modules/.bin/vitest run`.
- Plain `npm ls` reproduced the same zero-CPU sleep, proving the stall is below Vitest collection.
- A macOS process sample showed all four libuv filesystem workers blocked in kernel `read()` calls.
- The repository is under the iCloud Drive File Provider domain; 68,605 of 69,007 files in `node_modules` were `compressed,dataless`, including Vitest/Vite runtime files and iCloud conflict copies.
- `fileproviderctl` reported the folder was not pinned, not recursively downloaded, and had no supported CLI download/keep-downloaded action. `.nosync` was also not excluded by this provider.
- The first repaired one-file test passed 22/22, but Vitest recreated a cache-only `apps/mission-control/node_modules/.vite`; the initial health guard correctly failed the next root run but was too broad for Vitest's default cache location.

### Suggested Fix
Install dependencies under a local non-File-Provider cache, symlink the repository `node_modules` to that hydrated tree, move Vitest's cache outside iCloud, remove nested workspace caches, and make test/build commands fail fast when Node 20 or dependency hydration requirements are not met.

### Metadata
- Reproducible: yes
- Related Files: package.json, scripts/file-provider-deps.mjs, apps/mission-control, tests/test_relay.py
- See Also: ERR-20260715-009

### Resolution
- **Resolved**: 2026-07-15T22:06:04+05:00
- **Notes**: Added Node 20/dependency health preflights, an external hydrated dependency cache with stale-aware multi-agent repair locking, and an external Vitest cache. `npm ls` now completes in 0.7 seconds; the representative test passed 22/22; root `npm test` passed 6 relay tests plus 70 files / 478 app assertions in 3.01 seconds; standalone TypeScript, boundaries, and the 163-page production build passed.

---

## [ERR-20260715-009] unscoped-git-diff-check-sleep

**Logged**: 2026-07-15T20:43:52+05:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
An unscoped `git diff --check` slept at zero CPU in the dirty multi-slice worktree.

### Error

The command produced no output and required process termination; an older sleeping instance was also still present.

### Context
- The worktree contains a large pre-existing documentation/tooling slice alongside the relay repair.
- `git status` and a scoped `git diff --no-ext-diff` completed normally.

### Suggested Fix
Use `GIT_PAGER=cat git diff --no-ext-diff --check -- <claimed-files>` for the active slice, and inspect untracked files separately.

### Metadata
- Reproducible: intermittent
- Related Files: relay.py, package.json, AGENTS.md, CLAUDE.md, CHANGELOG.md, TASKS.md

### Resolution
- **Resolved**: 2026-07-15T20:43:52+05:00
- **Notes**: The scoped no-external-diff whitespace check completed successfully for all tracked relay-slice files. After the File Provider dependency repair, the previously sleeping unscoped `git diff --check` also completed with exit 0, confirming the same dataless filesystem state caused both stalls.

---

## [ERR-20260715-010] macos-cmp-prefix-exit

**Logged**: 2026-07-15T20:45:48+05:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
macOS `cmp -n` returned an EOF failure when comparing a saved file with a longer file whose prefix was identical.

### Error

`cmp: EOF on /tmp/nexus-handover-before-relay.md`

### Context
- The saved file was 142,377 bytes and the repaired relay had appended to the live handover.
- The message reflected unequal total lengths, not a byte mismatch in the prefix.

### Suggested Fix
Extract exactly the original byte count from the longer file into a temporary prefix file, then compare the equal-length files.

### Metadata
- Reproducible: yes
- Related Files: HANDOVER.md, relay.py

### Resolution
- **Resolved**: 2026-07-15T20:45:48+05:00
- **Notes**: Extracted the first 142,377 bytes with `dd`; full `cmp` passed with exit 0, proving exact prefix preservation.

---

## [ERR-20260715-011] external-workspace-dependency-shadow

**Logged**: 2026-07-15T22:21:00+05:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
The File Provider repair linked only the external root `node_modules` and discarded the external npm workspace's required nested dependency layer.

### Error

`npm ls` resolved `chokidar@3.6.0` from the external root even though Mission Control declares `chokidar@^4.0.3`; the locked `chokidar@4.0.3` existed only under the external cache's `apps/mission-control/node_modules`.

### Context
- Command: Node 24 `npm ls --depth=0` after a successful major-specific cache repair.
- The root cache correctly contains transitive `chokidar@3.6.0`; npm correctly installs the direct workspace requirement separately at `apps/mission-control/node_modules/chokidar@4.0.3`.
- The earlier repair removed every repository workspace `node_modules` path, so Node resolution from real Mission Control source files skipped the locked workspace-local layer.
- Root-level `npm ls` also labels hoisted packages extraneous when the entire root dependency tree is an external symlink; dependency correctness must be checked from the workspace resolution path rather than interpreting that symlink artifact as an install failure.

### Suggested Fix
Preserve the npm workspace layout by creating managed repository workspace `node_modules` symlinks to the matching external cache paths, reject unmanaged nested installs, and verify direct workspace dependency resolution after every repair.

### Metadata
- Reproducible: yes
- Related Files: scripts/file-provider-deps.mjs, apps/mission-control/package.json, package-lock.json
- See Also: ERR-20260715-008

### Resolution
- **Resolved**: 2026-07-15T22:30:00+05:00
- **Notes**: Cache schema v2 preserves npm's relocatable cached workspace link, adds managed repository workspace dependency links, validates every direct workspace version against the lockfile, allows normal npm nesting in CI/Render, and rejects pnpm or unmanaged cache state. Node 22 and Node 24 schema-v2 tests/builds passed.

---

## [ERR-20260715-012] skill-validator-missing-pyyaml

**Logged**: 2026-07-15T22:32:00+05:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The official skill validator could not start because both available Python interpreters lacked PyYAML.

### Error

`ModuleNotFoundError: No module named 'yaml'`

### Context
- Command: `quick_validate.py` against the eight repository skills.
- The failure occurred at the validator import before any skill was read.
- System and bundled workspace Python had the same missing module.

### Suggested Fix
Provide PyYAML with the validator runtime or use an isolated temporary target instead of mutating the project environment.

### Metadata
- Reproducible: yes
- Related Files: .agents/skills

### Resolution
- **Resolved**: 2026-07-15T22:33:00+05:00
- **Notes**: Installed PyYAML 6.0.2 into a temporary `/tmp` target, set `PYTHONPATH` for the validator process only, and all eight skills passed.

---

## [ERR-20260715-013] commit-preflight-git-object-stall

**Logged**: 2026-07-15T22:38:00+05:00
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
The pre-commit safety hook slept indefinitely while recursively counting the HEAD tree.

### Error

Four hook attempts reached `git ls-tree -r --name-only HEAD` and remained at 0% CPU until explicitly terminated.

### Context
- The staged index remained intact and no commit was created.
- `.git` contains 2,766 `dataless` File Provider stubs, including historical objects and index backups.
- The hook already has the fully staged index, so traversing historical tree objects is unnecessary for its tree-shrink calculation.

### Suggested Fix
Calculate the prior tree size from the staged index count minus staged additions plus staged deletions, avoid `ls-tree`/`write-tree`, and apply timeouts to Git subprocesses.

### Metadata
- Reproducible: yes
- Related Files: scripts/preflight-commit.mjs, .githooks/pre-commit
- See Also: ERR-20260715-008, ERR-20260715-009

### Resolution
- **Resolved**: 2026-07-15T22:40:00+05:00
- **Notes**: Removed HEAD object traversal, derived tree counts from the staged index and add/delete deltas, and added 15-second subprocess timeouts. Preflight completed in under three seconds with 39 files, zero deletions, and tree 610 to 638.

---
