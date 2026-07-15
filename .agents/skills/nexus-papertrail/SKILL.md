---
name: nexus-papertrail
description: Create durable NexusAI slice ledgers, checkpoints, handoffs, status reconciliations, and evidence-backed updates to TASKS.md, BACKLOG.md, HANDOVER.md, CHANGELOG.md, release runbooks, and implementation notes. Use at the start and end of coding slices, before stopping or handing off, after verification or deployment, when multiple agents are working, or whenever code and paperwork may drift.
---

# Nexus Papertrail

Make the repository sufficient to resume work without chat history. Preserve chronological evidence and distinguish implementation, Git, deployment, and operational states.

## Create the slice ledger

Before edits, create a unique ledger under:

`docs/agent-runs/YYYY-MM-DD/<slice-id>-<agent>.md`

Use `scripts/new_slice_ledger.py` from this skill for a deterministic template. Supply the slice ID, agent/branch purpose, objective, acceptance criteria, and claimed files. The script refuses to overwrite an existing ledger. Use `--dry-run` to preview.

Only the slice owner writes its ledger. The integration agent owns central documents.

## Checkpoint frequently

Append a timestamped checkpoint:

- before the first edit;
- after coherent implementation;
- after every verification pass or failure;
- before staging;
- after commit and push;
- after CI, deployment, and live smoke;
- whenever blocked;
- before stopping for any reason.

Include status, branch/worktree, local HEAD, pushed SHA, deployed SHA, changed files, commands and results, unresolved failures, external dependencies, and the next exact action. Use `apply_patch` to append; never rewrite previous entries.

## Reconcile central paperwork

Read [references/paperwork-map.md](references/paperwork-map.md). Update only documents affected by the settled truth:

- `BACKLOG.md`: priority, dependency, classification, and cross-document map;
- `TASKS.md`: execution checklist; mark complete without deleting history;
- `HANDOVER.md`: append-only chronological state and continuation;
- `CHANGELOG.md`: user-visible behavior, not internal activity;
- relevant architecture, workflow, security, release, deployment, or UI baseline document.

Prefer a separate documentation commit after runtime behavior is settled. Do not force every central document into every slice.

## Use precise status language

Use these states consistently:

- `code complete`
- `locally verified`
- `committed but unpushed`
- `pushed / CI pending`
- `CI green`
- `deployment pending`
- `migration pending`
- `DNS pending`
- `deployed at <sha>`
- `operationally verified`
- `blocked external`
- `blocked on user decision`
- `deferred`

Never use `shipped`, `green`, or `production ready` without the required evidence.

## Protect history

`relay.py` is a regression-tested compatibility adapter, not the source of truth. Preview it with `--dry-run`; a normal run must preserve the existing `HANDOVER.md` bytes as an exact prefix, append one fingerprinted section under a file lock, and create one unique dated ledger. Its `--commit` mode requires explicit files and refuses pre-existing staged changes. If any helper produces a broad replacement or unexpected deletion, stop, preserve the diff, and use `$nexus-recovery`.

Before completing the paperwork commit, inspect `git diff --stat`, `git diff --check`, and the exact changed sections. Ensure current facts did not erase useful historical context.
