---
name: nexus-recovery
description: Diagnose and safely recover interrupted, stalled, partially verified, or corrupted NexusAI work without losing another agent's changes. Use for command failures, TypeScript or build hangs, damaged Git index or locks, failed CI/deploy, partial edits, destructive paperwork rewrites, Clerk/session smoke failures, dependency-layout problems, or any resumed task whose trustworthy state is unclear.
---

# Nexus Recovery

Preserve evidence first, classify the failure, restore a trustworthy state, and resume from the newest durable checkpoint. Never use destructive cleanup as the first diagnostic step.

## Stabilize

1. Stop actions that could compound the problem.
2. Use `$nexus-papertrail` to record the failure, branch/worktree, HEAD, dirty files, command, error, and next diagnostic.
3. Read `AGENTS.md`, the slice ledger, `.learnings/ERRORS.md`, and [references/failure-playbook.md](references/failure-playbook.md).
4. Run read-only state checks:
   - `git status --short --branch`
   - `git log --oneline --decorate -10`
   - `git diff --stat`
   - `git diff --cached --stat`
   - `git diff --name-status`
   - `node -v`
   - process inspection when a command hung
5. Preserve unrelated changes and recovery artifacts.

## Classify

Choose the narrowest class:

- source/test defect;
- local runtime or filesystem stall;
- dependency-layout/cache issue;
- Git lock/index/ref/tree issue;
- interrupted/partial edit;
- CI-only environment failure;
- deployment or wrong-SHA state;
- DNS/edge/vendor configuration;
- Clerk session/org/middleware issue;
- migration/data prerequisite;
- permission/authorization;
- destructive paperwork rewrite;
- external/user-decision blocker.

Do not retry until a condition relevant to the class changes.

## Recover safely

- Do not run `git reset --hard`, destructive checkout, broad clean, or force push without explicit approval.
- Do not delete lock files until verifying no live Git process owns them. Preserve suspicious locks/refs before repair.
- Compare tree/file counts before accepting Git recovery.
- Do not remove user files merely because they are untracked; untracked Next route files can affect builds and must be investigated/preserved safely.
- Move or remove nested foreign dependency state only after proving it is the invalid npm-workspace shadow described by repo guardrails.
- Clear generated caches only when the failure class supports it and source files are safe.
- Restore overwritten paperwork from Git/current diff, then append the intended new section with a small patch.
- For stale Clerk sessions, start a fresh sign-in and refresh/touch the active session after org switching before blaming application code.

## Re-verify

Run the smallest diagnostic proving recovery, then the applicable `$nexus-release-gauntlet` or `$nexus-live-smoke`. A recovered process or file is not enough; prove the original outcome.

Record whether the failure is resolved, mitigated, still reproducible, or blocked. Add or update a `.learnings` entry for non-obvious or recurring failures.

## Resume

Re-read the current diff and ledger, restate the next exact action, and return control to `$nexus-build-loop`, `$nexus-commit-and-pr`, or `$nexus-live-smoke` as appropriate.

If recovery requires new authority, external coordination, or a product decision, stop with a durable checkpoint and one precise request.
