---
name: nexus-release-gauntlet
description: Run, interpret, and record the NexusAI local release gates for boundaries, TypeScript, Vitest, production build, staged-tree safety, and CI authority. Use before committing or shipping Nexus code, after broad refactors or dependency changes, when asked to verify a release, or when a test, typecheck, build, timeout, or environment mismatch must be classified honestly.
---

# Nexus Release Gauntlet

Prove a Nexus change in escalating order. Preserve failures as evidence and never convert a timeout or skipped phase into a pass.

## Preflight

1. Work from the repository root.
2. Read `AGENTS.md`, `docs/ENGINEERING_GUARDRAILS.md`, and [references/gate-matrix.md](references/gate-matrix.md).
3. Confirm Node 24 with `node -v` for production parity. Use the repository `.nvmrc`; on the current Mac, the known fallback is `/opt/homebrew/opt/node@24/bin`. Node 22.12+ may be used only for the explicit compatibility pass.
4. Run `git status --short --branch` and preserve unrelated changes.
5. Run `npm run deps:check` and confirm dependencies come from the root npm workspace. Do not install with pnpm or inside `apps/mission-control`; use `npm run deps:repair` for dataless File Provider state.

## Run gates

Run cheap and focused checks before broad ones:

1. relevant focused tests;
2. `npm run check:boundaries`;
3. `npm exec -w @nexus/mission-control tsc -- --noEmit --incremental false`;
4. `npm test`;
5. `NEXT_TELEMETRY_DISABLED=1 npm run build`;
6. `npm run verify:release` when the full local release gate is required;
7. `git diff --check`;
8. staged-tree checks from `$nexus-commit-and-pr` when publication is next.

Do not run the expensive full gauntlet repeatedly while a focused failure remains.

## Classify results

Record each phase as `passed`, `failed`, `timed_out`, `skipped_not_applicable`, or `not_run`. Include command, runtime version, duration when useful, and relevant counts.

The standalone TypeScript process has an intermittent local filesystem stall. If it times out:

1. capture the verifier diagnostics;
2. confirm Node 24 primary or Node 22.12+ compatibility and retry once only if the runtime or environment changed;
3. run full Vitest and the production build separately;
4. classify local release verification as incomplete;
5. require clean GitHub CI as the TypeScript authority before shipment;
6. use `$nexus-recovery` if the stall is novel, recurring beyond the known pattern, or leaves processes/state behind.

Next.js build-time typechecking does not erase a failed standalone typecheck gate. Conversely, an intermittent local stall is not proof of a source-code type error.

## Enforce build-specific rules

A production build is mandatory for front-end, auth-shell, middleware, observability, graph, vault-sync, dependency, Next config, or route-tree changes. Tests and standalone TypeScript cannot detect every bundle-path failure.

Do not bypass:

- banned client/server imports;
- Sentry/tracing feature gates;
- conflict-copy route detection;
- nested pnpm layout detection;
- release timeouts;
- staged mass-delete protection.

## Finish

Append the gate matrix and honest overall status to the slice ledger through `$nexus-papertrail`.

Use `locally_verified` only if every required local gate passed. Use `local_verification_incomplete_ci_required` when the known TypeScript stall is the only inconclusive gate and independent tests/build passed. Never claim `ci_green`, `deployed`, or `operationally_verified` here.
