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
