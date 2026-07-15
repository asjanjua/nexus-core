---
name: nexus-commit-and-pr
description: Publish verified NexusAI work through safe branch or worktree setup, explicit staging, staged-tree guardrails, atomic commits, push, pull request creation, and CI follow-through. Use when asked to commit, sequence commits, push, open a PR, fix CI after publication, or safely integrate work from multiple Nexus agents.
---

# Nexus Commit and PR

Publish only the intended verified slice. Preserve unrelated work and keep runtime truth separate from paperwork reconciliation.

## Confirm authority and state

1. Determine whether the user authorized commit, push, PR, merge, and deployment separately. Do not infer merge or production authority from commit authorization.
2. Read `AGENTS.md`, the slice ledger, and [references/publication-protocol.md](references/publication-protocol.md).
3. Run `git status --short --branch`, `git log --oneline --decorate -10`, and inspect the full diff.
4. If parallel work is active, publish from the assigned worktree and branch `codex/<slice-id>-<purpose>`.
5. Do not switch branches over unrelated dirty changes. Do not stage another agent's files.

## Verify before staging

Require an appropriate `$nexus-release-gauntlet` result. A known local TypeScript stall may proceed only when the ledger says `local_verification_incomplete_ci_required`, independent full tests/build passed, and the branch will be gated by CI.

Do not publish source failures, missing acceptance criteria, or undocumented partial migrations as complete work.

## Stage explicitly

1. List the exact files belonging to the logical slice.
2. Stage explicit paths with `git add -- <paths>`.
3. Inspect:
   - `git diff --cached --stat`
   - `git diff --cached --name-status`
   - `git diff --cached --check`
   - `git diff --cached`
4. Run `npm run commit:check`.
5. Stop on unexpected deletion, generated output, secret/config material, conflict-copy routes, caches, node_modules, or unrelated files.

Never use the large-commit override without a reviewed exceptional migration/recovery and explicit understanding of the staged tree.

## Sequence commits

Prefer:

1. runtime/security/schema/tests commit;
2. papertrail and operational-evidence reconciliation commit after code truth settles.

Keep tightly coupled migration and compatibility code together. Do not create artificial commit boundaries that leave the branch broken.

Use a concise conventional message (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) describing the outcome.

After each commit, record the SHA and exact files in the slice ledger. Confirm the remaining worktree changes are expected.

## Push and open the PR

Push only when authorized. Open a draft PR while deployment, migration, or operational proof remains pending; mark ready only when review and CI gates are satisfied.

Include:

- outcome and scope;
- key implementation decisions;
- verification commands/results;
- migration/deployment ordering;
- security/tenant considerations;
- screenshots only when they prove relevant UI state;
- unresolved external or operational work;
- links to the slice ledger and governing task/spec.

Use a connected GitHub workflow or `gh` when available. Never expose credentials or grant the CI repair job write access beyond its need.

## Babysit CI

Wait for required checks. On failure:

1. inspect the exact failing job/log;
2. reproduce locally when feasible;
3. use `$nexus-recovery` for environment/tooling failures or `$nexus-build-loop` for source failures;
4. review and run the required gates again;
5. create a focused follow-up commit and push;
6. repeat until CI is green or a genuine blocker is documented.

Do not report publication complete while CI is failing or pending.

## Integration

The integrator reviews every agent commit before cherry-pick/merge. Confirm file ownership, tests, migrations, and central paperwork after integration. Do not let two loops push to the same branch.

Merge only with explicit authority and required reviews/checks. Route deployment proof through `$nexus-live-smoke` and final paperwork through `$nexus-papertrail`.
