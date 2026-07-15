---
name: nexus-build-loop
description: Implement NexusAI code slices through a disciplined build, review, test, fix, and re-review loop. Use when adding or changing Mission Control routes, APIs, services, repositories, migrations, workers, connectors, agent runtimes, tests, or any roadmap item that must become a complete verified implementation rather than a plan.
---

# Nexus Build Loop

Implement one coherent slice until its acceptance criteria pass. Do not advance with a broken tree or an undocumented partial state.

## Define the slice

1. Read the governing specification and existing code/tests around the target.
2. Read [references/slice-contract.md](references/slice-contract.md).
3. Confirm a slice ledger exists through `$nexus-papertrail`.
4. Write 2-6 measurable acceptance criteria, including rejection and recovery behavior.
5. Identify the smallest vertical path that delivers the outcome without speculative architecture.

If the slice changes user-visible pages or components, invoke `$nexus-frontend-orchestrator` before implementation.

## Build

1. Follow existing contracts, service, repository, audit, and route patterns.
2. Keep route handlers thin and server enforcement authoritative.
3. Preserve workspace scoping, sensitivity, provenance, confidence, and approval boundaries.
4. Model new states explicitly with discriminated unions or validated enums.
5. Make long-running effects observable. Persist status and failure taxonomy rather than hiding background work.
6. Add idempotency where a retry could duplicate a consequential effect.
7. Add tests with the implementation, including invalid input, ownership, failure, retry, and state-transition cases where relevant.
8. Do not modify unrelated dirty files.

Checkpoint after the first coherent implementation.

## Review

Review the uncommitted diff. Use `/review` when available; otherwise perform a deliberate diff review. Fix in-scope correctness, security, edge-case, performance, maintainability, and UX issues.

Run an additional security pass for auth, workspace identifiers, user input, data access, connectors, webhooks, billing, email, files, LLM calls, and migrations. Check:

- caller-controlled workspace overrides;
- missing ownership predicates;
- missing Zod or equivalent validation;
- sensitive data in logs, email, exports, or summaries;
- partial or impossible states;
- retries without idempotency;
- missing audit events;
- success responses that hide failed effects;
- production build-path violations.

Re-review after fixes until clean. Record material findings in the ledger.

## Test and fix

Run the narrowest relevant tests first. Then use `$nexus-release-gauntlet` for broad proof. Exercise the real API or UI flow when feasible.

Any failure returns to implementation, review, and verification. Do not weaken tests, timeouts, auth, validation, or build guards merely to obtain green output.

Classify pre-existing failures separately and prove they are unrelated before proceeding.

## Complete the slice

Call the slice `locally_verified` only when every acceptance criterion has evidence and the required local gates have passed. Then route publication through `$nexus-commit-and-pr` and central-document reconciliation through `$nexus-papertrail`.

Report files changed, behavior added, review findings fixed, tests run, gate results, unverified external behavior, and the next exact step.
