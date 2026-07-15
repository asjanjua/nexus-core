---
name: nexus-live-smoke
description: Verify deployed NexusAI releases across live SHA identity, health, configurable domains, security headers, CORS, hosted Clerk handoff, authenticated routes, workspace switching, and milestone workflows. Use after a deploy, when asked to smoke or re-smoke production, for custom-domain or auth incidents, or whenever local verification must be separated from operational proof.
---

# Nexus Live Smoke

Prove what is live without conflating code, configuration, DNS, session, migration, or application failures. Retry only after a relevant condition changes.

## Prepare

1. Read `AGENTS.md`, the current release gate, `docs/PRODUCTION_HEALTH_CHECKLIST.md`, and [references/smoke-matrix.md](references/smoke-matrix.md).
2. Confirm authorization for live read actions and any planned external mutations. Do not change DNS, Clerk, Render, Neon, mail, or production data merely to complete a smoke check.
3. Record local HEAD, pushed SHA, expected deployed SHA, active origin, product domain, and migration expectations.
4. Use a configurable origin. Do not hardcode `app.pinavia.co` as a permanent product invariant.

## Prove deployment identity

Confirm the live commit separately from health. Prefer a deployed release marker such as `sentry-release=<sha>` when present, Render deployment metadata/logs, or another direct build marker.

Classify mismatches as `deployment_pending` until proven otherwise. A healthy old release is not the expected deployment.

## Run public smoke

Run:

`APP_URL=<active-origin> EXPECT_CORS_ORIGIN=<active-origin> npm run smoke:domain -w @nexus/mission-control`

This covers health, home response, HSTS, CSP, frame protection, workspace sign-in redirect, expected-origin CORS, and rejection of an unknown origin. Preserve the exact origin and result.

If raw shell fetch and browser behavior differ, prefer the canonical smoke plus browser evidence; record edge/protection differences rather than inventing an app defect.

## Run auth smoke

When protected behavior matters:

1. start from a fresh sign-out/sign-in cycle;
2. verify hosted Clerk links use an absolute return URL to the active app origin;
3. confirm the session and active organization/workspace;
4. after organization switching, refresh/touch the Clerk session before trusting protected APIs;
5. exercise the protected routes and API-backed states required by the release;
6. distinguish shell rendering from authenticated data success;
7. inspect Render logs when Clerk middleware, permissions, or server errors are ambiguous.

Use the in-app browser for isolated test accounts and local/public flows. Use Chrome only when the task depends on the user's existing authenticated profile. Never expose credentials, tokens, or personal data in evidence.

## Run workflow smoke

Exercise the smallest durable end-to-end workflow that proves the changed behavior. For regulated pilot gates, use the blocked-to-ready-to-confirm sequence when relevant rather than a dashboard-only check.

Verify rejection paths, reviewer/approval identity, evidence state, and persistence. Do not seed, email, invite, approve, or mutate production data without explicit authorization and an isolated test workspace.

## Diagnose and retry

Classify failures as:

- wrong or pending deploy SHA;
- DNS/provider propagation;
- missing vendor environment/configuration;
- migration pending;
- stale Clerk session or org switch;
- permission/role policy;
- application defect;
- network/edge protection;
- test-data prerequisite.

Retry only after changing the relevant condition. Use `$nexus-recovery` for an unexpected failure and `$nexus-papertrail` after every meaningful attempt.

## Record proof

Record timestamp/timezone, origin, route/flow, account/workspace class without PII, local/pushed/deployed SHAs, commands, browser steps, results, logs consulted, remaining uncertainty, and next action. Update release/runbook documents only after evidence settles.
