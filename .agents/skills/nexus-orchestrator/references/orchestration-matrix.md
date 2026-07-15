# Orchestration Matrix

## Source hierarchy

1. Current executable code, migrations, configuration, and tests
2. Current Git and CI state
3. Direct deployment and workflow evidence
4. `docs/ARCH_REVIEW_2026-07-10_ADOPTION.md` and the governing feature specification
5. `BACKLOG.md` for priority and dependency mapping
6. `TASKS.md` for execution checklists
7. `HANDOVER.md` for chronological context
8. `CHANGELOG.md` for user-visible history

Correct stale paperwork after implementation truth is settled. Never use stale paperwork to rebuild already-shipped behavior.

## Lane routing

| Slice signal | Primary lane | Supporting lane |
| --- | --- | --- |
| Page, component, navigation, responsive, accessibility, visual state | `nexus-frontend-orchestrator` | build loop, release gauntlet, browser smoke |
| API, service, repository, migration, worker, connector | `nexus-build-loop` | security review, release gauntlet |
| Auth, authorization, workspace ownership, sensitive data | `nexus-build-loop` | mandatory security review and authenticated smoke |
| Git history, staging, branch, PR, CI | `nexus-commit-and-pr` | release gauntlet |
| Deployment SHA, domain, health, Clerk flow | `nexus-live-smoke` | papertrail |
| Timeout, broken index, interrupted edit, stale session | `nexus-recovery` | papertrail |

## Status vocabulary

Use only evidence-backed states:

- `queued`
- `in_progress`
- `code_complete`
- `locally_verified`
- `committed`
- `pushed`
- `ci_green`
- `deployment_pending`
- `deployed`
- `operationally_verified`
- `blocked_external`
- `blocked_decision`
- `deferred`

Record local HEAD, pushed SHA, and deployed SHA separately.

## Default priority

1. Security, tenant isolation, auth, data integrity, broken production paths
2. Current release and authenticated-smoke gaps
3. Paid-pilot P0/P1 operational trust controls
4. Approved architecture-adoption slices in dependency order
5. Complete error, recovery, loading, and empty states
6. Milestone UX polish
7. Lower-priority enhancements

Use the current date and current repo state. Do not follow old calendar language blindly.

## Ownership contract

Each writer declares:

- branch/worktree;
- slice ID;
- files claimed;
- acceptance criteria;
- expected commit boundary.

The integrator rejects overlapping claims, reviews every incoming diff, and alone updates central operating documents.
