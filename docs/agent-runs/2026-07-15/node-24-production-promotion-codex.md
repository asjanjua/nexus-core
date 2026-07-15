# Agent Run: node-24-production-promotion

- **Started:** 2026-07-15T22:54:39+05:00
- **Agent:** codex
- **Branch:** `main`
- **Starting HEAD:** `eefebad105a11a586c9eed74f750dc57b26e0d74`
- **Status:** `completed`

## Objective

Merge PR 4, prove the Node 24 Render deployment, run live public and authenticated smoke, and record exact production evidence.

## Acceptance Criteria

- [x] PR 4 merged.
- [x] Deployed SHA matches merged `main`.
- [x] Public domain smoke passes.
- [x] Authenticated protected-route smoke is proven or precisely classified.
- [x] Paperwork is updated.

## Claimed Files

- `docs/agent-runs/2026-07-15/node-24-production-promotion-codex.md`
- `HANDOVER.md`
- `TASKS.md`
- `BACKLOG.md`
- `docs/RELEASE_GATE_2026-07-07.md`
- `.learnings/ERRORS.md`

## Starting Worktree State

```text
## main...origin/main
```

## Checkpoints

### 2026-07-15T22:54:39+05:00 — merge confirmed and recovery worktree opened

- **Completed:** PR #4 merged after all required checks passed. GitHub `main` and a fresh external clone both resolve to merge commit `eefebad105a11a586c9eed74f750dc57b26e0d74`; the merged feature head is `539e1d642f7febd03114d86ec5cf5822cb7d46e7`.
- **Verification:** GitHub reported PR #4 `MERGED`; `git ls-remote` and the GitHub branches API independently returned `eefebad105a11a586c9eed74f750dc57b26e0d74`.
- **Recovery:** Three local fetches in the iCloud-hosted checkout slept at zero CPU while `git rev-list --objects ... --all` traversed dataless `.git` objects. Only those launched processes were terminated. No locks, refs, index, or user files were deleted. Publication and evidence work moved to this clean non-iCloud clone.
- **Pushed SHA:** `eefebad105a11a586c9eed74f750dc57b26e0d74` on `origin/main`.
- **Deployed SHA:** Not verified.
- **Blockers:** None for deployment verification; the original iCloud checkout remains unable to fetch reliably.
- **Next exact action:** Prove the Render deployment identity, run the canonical public domain smoke, then exercise authenticated protected routes.

### 2026-07-15T23:06:00+05:00 — Render failure isolated and Blueprint repaired

- **Completed:** Render auto-deploy attempted merge commit `eefebad` twice but correctly stopped at the runtime guard because the existing Blueprint-managed service retained `NODE_VERSION=20`. Service-level edits did not persist because Blueprint state remained authoritative. The Blueprint parser then exposed four invalid `plan: free` cron declarations that blocked the complete sync.
- **Implementation:** Changed all four cron plans to Render-supported `starter`; added `tests/render-blueprint.test.mjs`; wired the new Blueprint invariant test into root `npm test`.
- **Verification:** Render log proved both failed deploys checked out `eefebad` and selected Node 20.20.2 from the stored environment. `render.yaml` parses as YAML; Blueprint tests pass 2/2; Node 24 dependency health, boundaries, standalone TypeScript, 70 Vitest files / 478 assertions, and the 163-page production build all pass through `npm run verify:release`.
- **Pushed SHA:** `eefebad105a11a586c9eed74f750dc57b26e0d74`; the focused Blueprint repair is not yet committed.
- **Deployed SHA:** `7401e409dfa358b024e1b2e64869fb3af7197af8` remains live; `eefebad` is not live.
- **Blockers:** Blueprint sync may create or update four `starter` cron resources, so the Render change preview must be inspected before applying the production mutation.
- **Next exact action:** Commit and push the verified Blueprint repair, inspect Render's manual-sync preview, then apply only if the resource impact matches the existing production intent.

### 2026-07-15T23:21:00+05:00 — Node 24 live; authenticated smoke isolated a hydration boundary

- **Completed:** Split cost-bearing cron resources into the explicit `render.cron.yaml` Blueprint, synced the primary web-only Blueprint, and deployed Node 24.18.0 at `c900cf8bf7171913d6437d81ae084c21e5119ca3`. The canonical public smoke passed 8/8 and a fresh hosted-Clerk/Google sign-in returned to `/dashboard/ceo` with live workspace data.
- **Failure boundary:** The first authenticated dashboard render emitted React hydration error 418. The server-rendered executive brief calls `toLocaleTimeString()` without a locale or timezone, so Render UTC and the browser timezone produce different text for the same `generatedAt` value.
- **Fix slice:** Make the rendered timestamp deterministic across server and browser; add a regression test; rerun the focused test and full release gauntlet; deploy; repeat the authenticated browser smoke with a clean console.
- **Acceptance criteria:** Identical formatted output under different process timezones; no new client-bundle boundary import; focused and full gates green; deployed dashboard renders populated data without a current hydration error; paper trail reconciled.
- **Non-goals:** No changes to synthesis generation, authorization, workspace data, or production records.
- **Next exact action:** Implement the deterministic formatter and regression test, then review the scoped diff before verification.

### 2026-07-15T23:25:00+05:00 — hydration fix locally verified

- **Implementation:** Added a shared UTC formatter with an invalid-input fallback and rendered the executive brief timestamp as semantic `<time>` text. The server and browser now produce identical first-render content regardless of their local timezone.
- **Focused proof:** The new regression test passes under both the Node 22 compatibility rung and Node 24 production rung, including an explicit UTC-versus-Asia/Karachi equality assertion.
- **Release proof:** Node 24.14.1 passed build boundaries, TypeScript, 71 Vitest files / 480 assertions, and the clean 163-page Next.js production build.
- **Review:** Scoped diff and React checklist are clean; no new state, effect, client-only API, auth, data, or fragile build-path dependency was introduced.
- **Status:** `locally_verified`.
- **Next exact action:** Commit and push the runtime fix, wait for Render's Node 24 deployment, then repeat authenticated smoke in a clean-console tab.

### 2026-07-15T23:31:00+05:00 — post-deploy auth expiry isolated to the missing Clerk provider

- **Production proof:** Render deployed `d51cb0b02ba0146e642d729b264b7127973a6705`; GitHub CI and CodeQL passed on that SHA; the public smoke passed 8/8. A clean-console authenticated dashboard rendered the deterministic `06:26 PM UTC` timestamp with populated workspace data and no Nexus console error.
- **Next boundary:** The subsequent `/knowledge` navigation returned an unauthenticated shell, and returning to `/dashboard/ceo` redirected to sign-in. This is session-wide expiry, not a Knowledge API scope defect.
- **Root cause:** Nexus retained `clerkMiddleware()` but removed `<ClerkProvider>` with the larger Clerk client UI during the prior build-hang repair. Clerk documents a one-minute session-token TTL and automatic client refresh/touch behavior; without the provider, long-lived browser sessions are not refreshed.
- **Fix slice:** Reintroduce only the root `<ClerkProvider>` required by Clerk's App Router integration. Keep `SignedIn`, `SignedOut`, `UserButton`, `OrganizationSwitcher`, and Clerk client hooks out of the production bundle.
- **Acceptance criteria:** Source invariant proves provider-only integration; build-boundary gate stays green; Node 24 full release gauntlet completes without the historical hang; production session remains authenticated across protected navigations after the one-minute token window; protected routes render without Nexus console errors.
- **Next exact action:** Implement the provider-only boundary and source regression test, then run the full Node 24 gauntlet before any publication.

### 2026-07-15T23:34:00+05:00 — provider-only session refresh locally verified

- **Implementation:** Wrapped all root-layout branches in Clerk's required `<ClerkProvider>` while retaining plain hosted-auth links and excluding `SignedIn`, `SignedOut`, `SignInButton`, `UserButton`, `OrganizationSwitcher`, and client auth hooks.
- **Focused proof:** Hosted-Clerk source invariant passes 4/4 and build boundaries remain clean.
- **Release proof:** Node 24.14.1 passed TypeScript, 71 Vitest files / 481 assertions, and the clean 163-page production build in 36.6 seconds. The historical Clerk bundle hang did not recur; shared first-load JS moved from 102 kB to 103 kB.
- **Review:** Provider is the smallest App Router integration supported by Clerk; server-side `safeAuth` and `requireScope` remain authoritative, and no authorization logic moved to the browser.
- **Status:** `locally_verified`.
- **Next exact action:** Commit and push the provider-only runtime fix, wait for CI/Render, perform a fresh hosted sign-in, wait beyond the one-minute token TTL, then navigate the protected route set.

### 2026-07-15T23:48:00+05:00 — session refresh proven; migration drift isolated

- **Live session proof:** Render deployed `570d43a9de43c325fe5c5a20cafac595d7197d77`. The provider synchronized the stale hosted session without credentials or storage manipulation. After more than one minute, `/knowledge`, `/settings/connectors`, and `/workflows` remained organization-authenticated with zero Nexus console errors.
- **Smoke harness recovery:** Persistent Clerk background traffic prevents the browser harness's default navigation-settled condition. DOM-ready navigation (`waitUntil: domcontentloaded`) provides reliable route proof without weakening the app.
- **Next boundary:** `/reviewer-seat` loaded the authenticated shell but its API response was not parseable JSON, producing `Network error loading reviewer seats.` Repository state already records migration `0035` as production-pending; the adjacent `0036` and `0037` additive migrations are also pending.
- **Root cause:** The free Render service has neither Shell/one-off jobs nor paid `preDeployCommand`, and the Blueprint build currently never runs the repository's idempotent migration runner.
- **Fix slice:** Run `npm run db:migrate` after a successful production build in the free-tier `buildCommand`; add an ordering invariant so migrations cannot run before a failed build or silently disappear from the Blueprint.
- **Acceptance criteria:** Blueprint test proves install -> build -> migrate order; Node 24 release gauntlet passes; Render logs show pending migrations applied transactionally and service live; reviewer-seat GET renders its legitimate state; public smoke stays 8/8.
- **Next exact action:** Implement and release the build-time migration gate, then repeat the reviewer-seat read-only smoke.

### 2026-07-15T23:51:00+05:00 — automatic free-tier migration gate locally verified

- **Implementation:** Render's free-tier build now executes `npm ci && npm run build && npm run db:migrate`. The idempotent transactional runner executes only after a successful production build; already-applied migrations remain skipped.
- **Focused proof:** Blueprint invariants pass 3/3 and pin the exact install -> build -> migrate order.
- **Release proof:** Node 24.14.1 passed boundaries, TypeScript, 71 Vitest files / 481 assertions, and the clean 163-page build in 36.2 seconds.
- **Migration scope:** Pending files `0035_reviewer_seats.sql`, `0036_pilot_outcomes.sql`, and `0037_pro_waitlist.sql` create additive tables/indexes with `IF NOT EXISTS`; no destructive statement or data rewrite is present.
- **Status:** `locally_verified`.
- **Next exact action:** Commit/push, verify the Render build logs apply/skip the migration ledger as expected, then repeat the reviewer-seat and public domain smoke.

### 2026-07-15T23:56:00+05:00 — Node 24 production promotion operationally verified

- **Deploy proof:** Render deployment `dep-d9btcjmq1p3s73975msg` reached `live` at `32166903b55b2ce8239bd5eb21fc0bd4121811e2`; GitHub CI and CodeQL both completed successfully for that exact SHA.
- **Migration proof:** The authenticated `/reviewer-seat` page changed from its pre-release network-error state to the legitimate empty-seat state, rendering the current reviewer panel, invite form, and seat history with no console errors. This is read-only production proof that migration `0035` is available; the same ordered idempotent runner also processes additive migrations `0036` and `0037`.
- **Protected-route proof:** After the provider-only Clerk repair and beyond the one-minute token window, `/knowledge`, `/settings/connectors`, `/workflows`, and `/reviewer-seat` remained authenticated in the organization workspace. The dashboard rendered its UTC timestamp without hydration errors.
- **Public proof:** The canonical `app.pinavia.co` smoke passed all 8 checks: health, home, HSTS, CSP, frame protection, protected redirect, allowed-origin CORS, and unknown-origin rejection.
- **Cost boundary:** The primary `render.yaml` remains web-only. Four `starter` cron definitions are isolated in opt-in `render.cron.yaml` and were not activated during this promotion.
- **Residual gates:** A two-account reviewer invite/accept/approval rehearsal, Pro waitlist behavior, pilot-afterlife behavior, and scheduled product-email delivery remain separate product/operational smokes. The original iCloud checkout still has unreliable Git object hydration; use the clean external worktree for publication until repaired.
- **Final state:** `operationally_verified`; paperwork commit/push is the only remaining mechanical action for this ledger.
