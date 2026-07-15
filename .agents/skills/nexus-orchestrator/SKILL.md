---
name: nexus-orchestrator
description: Coordinate long-running NexusAI delivery from roadmap reconciliation through implementation, verification, commits, deployment proof, and paperwork. Use when asked to continue the Nexus plan, execute the next tasks, finish a milestone, run an autonomous coding loop, coordinate multiple agents or worktrees, or reconcile what is built versus still open in nexus-core.
---

# Nexus Orchestrator

Drive one milestone through small, proven slices. Treat the repository as durable memory and keep code, Git, CI, deployment, and paperwork states distinct.

## Start

1. Work from the repository root.
2. Read `AGENTS.md`, the newest `HANDOVER.md` section, the current priority sections of `TASKS.md` and `BACKLOG.md`, and the specification governing the likely slice.
3. Run `git status --short --branch` and `git log --oneline --decorate -10`.
4. Preserve unrelated changes. Never assign two writers the same files.
5. Read [references/orchestration-matrix.md](references/orchestration-matrix.md) before selecting work.

## Normalize the queue

Do not execute unchecked boxes blindly. Verify each candidate against code, tests, migrations, configuration, and current deployment evidence. Classify it as:

- `real_code_gap`
- `implemented_unverified`
- `local_verified_deploy_pending`
- `operational_external`
- `user_decision`
- `stale_or_duplicate`
- `deferred`

Select the smallest high-priority slice that advances the active milestone without crossing an unresolved dependency. Give it a stable kebab-case slice ID, acceptance criteria, likely files, verification commands, paperwork targets, and explicit external gates.

## Route the slice

Invoke skills in this order when applicable:

1. Use `$nexus-papertrail` to create the slice ledger before edits.
2. If the slice touches pages, components, navigation, user-facing copy, responsiveness, accessibility, or browser behavior, use `$nexus-frontend-orchestrator`.
3. Use `$nexus-build-loop` for implementation, review, tests, and fixes.
4. Use `$nexus-release-gauntlet` before publication.
5. Use `$nexus-commit-and-pr` for scoped commits, push, PR, and CI follow-through.
6. Use `$nexus-live-smoke` when deployment or production behavior is in scope.
7. Use `$nexus-papertrail` again to reconcile central operating documents after evidence settles.
8. On an unexpected interruption or failed gate, use `$nexus-recovery` before continuing.

Do not load every companion skill up front. Invoke only the lane needed for the current phase.

## Coordinate agents

Use parallel agents for independent, bounded work:

- read-only code or architecture exploration;
- security review;
- test-gap analysis;
- CI or log diagnosis;
- visual/browser verification;
- disjoint implementation slices in separate worktrees.

Keep the main agent responsible for requirements, queue state, file ownership, integration, central paperwork, and the final claim. Require each writer to return its branch, commit SHA, changed files, verification evidence, and open risks.

Parallel writers must use branches named `codex/<slice-id>-<purpose>` in separate worktrees. Assign central files (`TASKS.md`, `BACKLOG.md`, `HANDOVER.md`, `CHANGELOG.md`, release runbooks) only to the integration agent.

## Run the milestone loop

For each slice:

1. checkpoint;
2. implement;
3. review;
4. verify;
5. fix and repeat until green or genuinely blocked;
6. commit runtime truth;
7. push and make CI green;
8. deploy and smoke when authorized;
9. reconcile paperwork in a separate documentation commit;
10. select the next unblocked slice.

Continue until the milestone is operationally verified or only external, deferred, or decision-bound work remains. Do not stop merely because one slice is complete.

## Guardrails

- Preserve human approval for consequential Nexus actions.
- Keep workspace isolation, evidence provenance, sensitivity, and auditability intact.
- Do not introduce a new service boundary, provider, or broad dependency without an approved architecture trigger.
- Do not treat a passing build as production proof.
- Do not run production migrations, DNS changes, vendor-console mutations, merges, or releases without matching authorization.
- Do not use `relay.py` until it is verified to preserve rather than rewrite `HANDOVER.md` history.

## Report

Lead with milestone status. Separate local verification, committed/pushed state, CI, deployment SHA, live smoke, migrations, external configuration, and user decisions. End with the next exact action when work remains.
