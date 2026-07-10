# Release Gate — 2026-07-07 (Readiness Pipeline + Scorer Bridge)

Runbook for taking this session's work from a locally verified build to the live pilot URL. Self-contained; execute top to bottom. For first-time Render setup see `DEPLOY.md`; for the standing production gate see `docs/PRODUCTION_HEALTH_CHECKLIST.md`.

## 1. What is shipping

Four locally verified change sets, all in `apps/mission-control`:

1. Readiness to onboarding lane inheritance (migration `0033`).
2. Read and write API auth sweeps plus the strategy-profile authz fix.
3. Workflow scorer as governed pilot bridge with unified gate enforcement (migration `0034`).
4. Strategy-profile in-memory store fallback and the readiness claim email.

Two new migrations must be applied before this build serves traffic: `0033_readiness_submissions.sql` and `0034_strategy_profile_pilot_ready.sql`.

## 2. Preflight (local, before touching production)

Run from `apps/mission-control`:

```bash
npm run test        # expect: all suites pass (61 files / 430 tests at time of writing)
npm run build       # expect: clean Next.js production build
```

Confirm the two migrations exist and are the last two in order:

```bash
ls db/migrations | tail -2
# expect:
# 0033_readiness_submissions.sql
# 0034_strategy_profile_pilot_ready.sql
```

Do not proceed if tests or build fail.

## 3. Confirm environment variables in Render

Open the `nexus-mission-control` service. These must be set for this release. Items marked NEW are needed by this session's features.

```text
DATABASE_URL=                     # Neon pooled connection string
NEXT_PUBLIC_APP_URL=              # NEW-critical: canonical deployed app URL, e.g. https://app.pinavia.co — used to build readiness claim links
NEXUS_PRODUCT_DOMAINS=            # Optional comma-separated product-domain bases. Defaults include pinavia.co and pinavia.io.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
AUTH_SECRET=
NEXUS_DB_REQUIRED=true            # forces the DB path; prevents silent store-fallback in production
NEXUS_ENV=pilot
NEXT_PUBLIC_NEXUS_ENV=pilot
NEXUS_RESEND_API_KEY=             # NEW-optional: enables the readiness claim email. If unset, the email is skipped and audited (readiness.claim_email_skipped) — not an error.
NEXUS_FROM_EMAIL=                 # NEW-optional: defaults to "NexusAI <briefs@pinavia.io>"
```

Two deliberate behaviours to know:

- Do not hardcode `app.pinavia.co` in product logic or future runbooks. It is the current pilot host only and may change after this month. Runtime code should use `NEXT_PUBLIC_APP_URL` for canonical links and `NEXUS_PRODUCT_DOMAINS` for allowed product-domain host detection/CORS.
- With `NEXUS_DB_REQUIRED=true`, the strategy-profile store fallback is bypassed and the app uses Postgres only. The fallback is for no-database demos, never production.
- If `NEXUS_RESEND_API_KEY` is unset, readiness still works; the claim travels by URL and sessionStorage, and the email step is skipped and logged. Set it only when the `pinavia.io` sender domain is verified in Resend.

## 4. Apply migrations to Neon

The migrate runner is idempotent: it records applied migrations in `_nexus_migrations` and applies only what is pending, each in its own transaction.

```bash
# with DATABASE_URL pointing at the production Neon database
npm run db:migrate
# expect: it reports applying 0033 and 0034 (and nothing already-applied)

npm run db:check
# expect: ok=true against neondb
```

If `db:migrate` fails mid-run, it rolls back the failing migration; fix the cause and re-run — already-applied migrations are skipped.

## 5. Deploy and confirm the served commit

1. Push the release commit to `main`.
2. In Render, confirm the service deploys that exact SHA (Events tab shows the commit).
3. Confirm health:

```bash
curl -s https://<pilot-host>/api/health | jq
# expect: status ok; db, llm, and (if enabled) vector/storage all healthy
```

Do not run the smoke until the served SHA matches the release commit. A stale deploy is the most common cause of "the fix isn't working."

## 6. Authenticated smoke — the six-step trace

Run in a logged-in browser session (Clerk blocks unauthenticated curl). This traces the whole pipeline end to end.

1. **Readiness assigns a lane.** Open `/readiness`, answer all seven dimensions, then on the profile step choose a regulated sector (e.g. Financial Services / Fintech), a size, and a role. Submit. Expect the result card to show a governed-deployment framed next step and a "Continue — your result carries over" button.

2. **Claim carries into signup.** Click continue. The URL should carry `?readiness=<code>`. Complete Clerk signup. Expect no re-asking of the readiness questions.

3. **Profile inherited.** In onboarding, expect the lane banner "From your readiness assessment" showing the regulated lane. Confirm the wizard prefilled sector from readiness.

4. **Scorer runs and gates block.** Go to `/workflows`, create starter twins if needed, run the scorer. Expect: a recommendation is shown, the Regulatory Response and Agreement Review twins appear under "Not suitable for a first pilot," and the gate checklist shows sponsor/reviewer/evidence still blocked. The "Confirm as first pilot" button is disabled.

5. **Gates clear, confirm succeeds.** Name a sponsor and reviewer (strategy profile) and connect or upload one evidence source, then re-run the scorer. Expect `pilot-ready`; the confirm button enables. Click it. Expect the selected workflow to persist.

6. **Server enforcement holds.** Optional API check: with the browser session, `PATCH /api/strategy-profile` with `{ "selectedWorkflow": "X" }` on a workspace that is not pilot-ready must return 400 `pilot_gates_unmet` with `blockedGates`. This proves the gate is server-side, not just UI.

Record pass/fail per step. Any failure at step 3 or 4 usually means the migrations did not apply or the served SHA is stale — recheck sections 4 and 5.

## 7. Rollback

- **App:** redeploy the previous known-good SHA in Render.
- **Migrations:** `0033` and `0034` are additive (new table, new nullable/defaulted columns). They do not need to be reversed for an app rollback; the previous build simply ignores the new columns. Only hand-write a down migration if a column default causes a problem, which is not expected here.

## 8. Sign-off

Release is complete when: tests and build passed locally, `0033` and `0034` are applied and `db:check` is ok, the served SHA matches the release commit, `/api/health` is ok, and all six smoke steps pass. Record the deploy SHA and date in `HANDOVER.md`.

## 9. Verification Snapshot — 2026-07-07

This is the dated evidence from the 2026-07-07 regulated-demo release-gate run.

- **Local verification**
  - `npm exec -w @nexus/mission-control vitest run` -> `62` files / `438` tests passed.
  - Focused regression after the middleware fix:
    `tests/security-headers.test.ts`,
    `tests/product-detection.test.ts`,
    `tests/workflow-twins.test.ts`,
    `tests/strategy-profile-authz.test.ts` -> `36` tests passed.
  - `npm run build -w @nexus/mission-control` exited `0`.
- **Served commit**
  - Local `HEAD` and `origin/main`: `53b4d0ac76c2a729f451896b03602270f223260c`
  - Live `https://app.pinavia.co/sign-in` page includes
    `sentry-release=53b4d0ac76c2a729f451896b03602270f223260c`
  - Conclusion: the active pilot host is serving the expected commit.
- **Health**
  - `https://app.pinavia.co/api/health` returned `ok=true` with healthy
    database, vector search, originals storage, and llm checks at
    `2026-07-07T15:55:58.471Z`.
- **Domain/DNS**
  - `app.pinavia.co` resolves to the Render service and is the active verified
    pilot host.
  - `app.pinavia.io` and `nexus.pinavia.io` did not resolve in this shell during
    the check. Treat that as DNS/provider propagation pending, not an app-code
    blocker.
- **Migration readiness**
  - Direct Neon migration commands were not run in this session.
  - Production behavior strongly indicates `0033` and `0034` are already
    applied: readiness produced a claim URL, onboarding inherited the regulated
    lane, and the authenticated dashboard rendered pilot status fields
    (`selectedWorkflow`, `pilotReady`, `pilotGates`) from `strategy_profiles`.
- **Authenticated workflow smoke**
  - Verified live in an authenticated browser on `app.pinavia.co`:
    1. `/readiness` with a regulated profile returned governed deployment.
    2. Continue link carried `?readiness=...` into signup.
    3. `/onboarding` showed the inherited regulated banner and sector context.
    4. `/knowledge`, `/settings/connectors`, and `/dashboard/ceo` rendered while
       signed in.
    5. Existing populated workspace showed `Decision & Action Twin` selected,
       `pilot-ready`, and sponsor/reviewer/evidence gates all `ready`.
  - Remaining gap: this session did not freshly prove the exact blocked -> ready
    transition in a brand-new workspace, nor re-run the optional
    `pilot_gates_unmet` API check on a blocked workspace.
- **Current release blocker**
  - `APP_URL=https://app.pinavia.co EXPECT_CORS_ORIGIN=https://app.pinavia.co node scripts/smoke-domain.mjs`
    still fails one check on production:
    `FAIL CORS allows expected origin — origin=none`
  - Root cause reproduced live: `OPTIONS` requests to protected API routes are
    being intercepted by Clerk before middleware can return the CORS preflight
    response.
  - Local fix is implemented in `middleware.ts` and covered by
    `tests/security-headers.test.ts`. It still needs commit, deploy, and
    production re-smoke before this gate is fully closed.

## 10. Verification Continuation — 2026-07-08

Follow-up verification on 2026-07-08 closed the live pre-pilot gate for the
currently active deployment:

- **Deploy**
  - Commit `920f562a5a8fc3f4de0e1bfe2adbfd4c9bf137ed` was pushed to `origin/main`.
  - `https://app.pinavia.co/sign-in?t=<cache-bust>` served
    `sentry-release=920f562a5a8fc3f4de0e1bfe2adbfd4c9bf137ed`.
- **Live health**
  - `https://app.pinavia.co/api/health` remained `ok=true`.
  - `https://app.pinavia.io/api/health` also returned `ok=true` once DNS
    propagated.
- **Domain smoke**
  - `APP_URL=https://app.pinavia.co EXPECT_CORS_ORIGIN=https://app.pinavia.co node scripts/smoke-domain.mjs`
    passed all 8 checks after the middleware deploy.
  - `APP_URL=https://app.pinavia.io EXPECT_CORS_ORIGIN=https://app.pinavia.io node scripts/smoke-domain.mjs`
    also passed all 8 checks.
- **Authenticated workflow proof — blocked -> ready**
  - In a fresh organization/workspace (`Nexus Gate Smoke 2026-07-08`), the
    strategy profile initially showed:
    `pilotReady=false`, `selectedWorkflow=null`, and all three gates blocked
    (`sponsor_named`, `reviewer_named`, `evidence_available`).
  - Server enforcement held before setup:
    `PATCH /api/strategy-profile` with
    `{ "selectedWorkflow": "Decision & Action Twin" }` returned
    `400 pilot_gates_unmet` plus the three blocked gates.
  - After enabling demo mode and running
    `POST /api/workspace/demo-reset?sector=financial_services`, the workspace
    seeded 5 evidence items and a regulated financial-services demo pack.
  - After naming sponsor and reviewer and re-running the scorer, the fresh
    workspace reached `pilotReady=true` with all three gates clear.
  - Final confirmation held server-side:
    `PATCH /api/strategy-profile` with
    `{ "selectedWorkflow": "Decision & Action Twin" }` returned `200`, and the
    profile persisted `selectedWorkflow="Decision & Action Twin"`.
- **Operator gotcha discovered**
  - After switching Clerk organizations in-browser, backend API routes in the
    same browser session did not always pick up the new org immediately.
    For reliable smoke on a newly created org, force a Clerk session refresh
    before API-backed checks. In browser automation this was resolved by calling
    `window.Clerk.setActive(...)` then `window.Clerk.session.touch()`.
  - Treat this as an operator/runtime nuance, not a blocker for demoing a single
    already-selected workspace.
