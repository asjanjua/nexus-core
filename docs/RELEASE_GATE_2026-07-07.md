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
NEXT_PUBLIC_APP_URL=              # NEW-critical: e.g. https://nexus.pinavia.io — used to build the readiness claim link
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
