# Regulated-Enterprise Demo Runbook

Status: Operational runbook for the live regulated-buyer demo (target: week of 2026-07-13).
Companion to `docs/RELEASE_GATE_2026-07-07.md` (executable cutover) and `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
Audience for the demo: bank/fintech buyer. Governance boundaries, evidence trail, and human approval are the product.

## 1. Pre-Demo Cutover (external actions — Ali at the keyboard)

Run `docs/RELEASE_GATE_2026-07-07.md` end to end. Summary of the non-negotiables:

1.1. Apply migrations `0033`-`0037` against the production Neon database (idempotent runner). `0033`/`0034` cover the readiness claim and scorer snapshot; `0035` (`reviewer_seats`), `0036` (`pilot_outcomes`), and `0037` (`pro_waitlist`) are required by the code on `main` since 2026-07-09 — the reviewer gate and approvals will look for `reviewer_seats`.

1.1a. Push local `main` to origin first (six commits ahead as of 2026-07-09, plus this session's funnel-gate work) and set the new envs in Render: `NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL` (hosted-Clerk handoff, required since `68a5a0b`), `NEXUS_OPS_EMAIL` (optional), `NEXUS_FUNNEL_VISIBILITY` (leave unset = operator-only), `NEXUS_OPERATOR_USER_IDS` (your Clerk user id, comma-separated), `NEXT_PUBLIC_NEXUS_FUNNEL_NAV` (leave unset = nav hidden).

1.2. Confirm Render is serving the intended commit SHA. As of 2026-07-07 the
active pilot host (`NEXT_PUBLIC_APP_URL`, currently `https://app.pinavia.co`)
served SHA `53b4d0ac76c2a729f451896b03602270f223260c`, `/api/health` was green,
and authenticated `/knowledge`, `/settings/connectors`, and `/dashboard/ceo`
rendered. The remaining release-gate blocker was the protected-route CORS
preflight check in `npm run smoke:domain`; do not demo until that fix is
deployed and re-smoked.

1.3. Set `NEXT_PUBLIC_APP_URL` (critical) and, if the claim-link email is part of the demo, `NEXUS_RESEND_API_KEY` + `NEXUS_FROM_EMAIL` with `pinavia.io` sender authentication.

1.4. Run the authenticated six-step smoke in a logged-in browser: readiness -> claim -> onboarding inheritance -> scorer gates -> confirm-first-pilot -> server enforcement (`pilot_gates_unmet`).

1.5. Verify the three cron services (dispatch, billing, synthesis) show green in the Render dashboard.

## 2. Seeded Workspace (the populated half of the demo)

The full-funnel walk lands in an empty workspace, which is exactly where the scorer signal is `none`. The demo therefore uses TWO workspaces:

- **Funnel workspace:** created live from `/readiness`, stays empty, shows the provisional-signal honesty line.
- **Populated workspace:** pre-seeded before the demo, shows Mission Control at full strength.

Seed the populated workspace by uploading, in this order, from `test-data/ingestion/`:

1. `Q2-2026-board-pack.pdf`
2. `risk-register-Q2-2026.xlsx`
3. `regulatory-compliance-update.txt`
4. `operational-kpis-may-2026.md`
5. `digital-banking-strategy-2026.docx`
6. `gcc-payments-market-intelligence.pdf`

Then, in the populated workspace, IN THIS ORDER (the reviewer gate changed on 2026-07-09 — naming a reviewer no longer clears it):

1. Run Ask twice so citations exist.
2. Set the sponsor name/email on the strategy profile.
3. **Reviewer seat (identity-bound):** from the reviewer-seat page, invite the second Clerk account (see §2a) and ACCEPT the invite from that account. The scorer's reviewer gate now requires an accepted seat, and once a seat exists only that reviewer's account can approve (`403 approval_requires_bound_reviewer` for anyone else).
4. **Approve one recommendation from the reviewer account** so the approval trail shows `approvedByBoundReviewer: true`.
5. Run the workflow scorer (signal should read `moderate` or better; all gates should show clear).
6. Run one native-skill review (evidence grid or Meridian compliance) from Settings so a governed agent output exists.

### 2a. Reviewer demo modes (decide at rehearsal, not on stage)

**Mode A — live two-account loop (primary).** Show invite -> accept -> identity-bound approval live. Requires: a second device or browser profile logged into the reviewer Clerk account, and a rehearsed org/workspace switch. KNOWN GOTCHA: after switching Clerk organizations in-browser, API routes may not honor the new org until the session refreshes — the reliable sequence is `window.Clerk.setActive(...)` then `window.Clerk.session.touch()`, or simply use separate browser profiles per account (recommended; avoids the switch entirely).

**Mode B — pre-staged seat (fallback).** Accept the invite before the demo; present from the reviewer account only. The approval trail still shows identity binding. Fall back to Mode B if the Mode A rehearsal shows any org-switch flakiness.

Go/no-go: rehearse Mode A end to end at least one day before. If the switch misbehaves twice, lock Mode B.

## 3. Demo Walk Order

1. **Readiness assessment** (public, no login). Pick financial services sector -> lane assigns `regulated_enterprise` server-side. Say: the client never chooses their own lane.
2. **Claim -> signup -> onboarding.** Show the lane banner inheriting context; show that leaving the regulated lane requires explicit confirmation. This is the governed-lifecycle story.
3. **Scorer in the fresh workspace.** Show the provisional-signal line under the recommendation. Talking point: the system labels how much customer signal backs its own recommendation — it knows what it does not know.
4. **Switch to the populated workspace.** Mission Control pilot-status card (lane, band, sponsor, reviewer, gates, signal), evidence with source trail, Ask with citations, approval queue.
4a. **Reviewer loop (Mode A).** Invite the reviewer live, accept on the second device, approve one recommendation as the reviewer, then show the same approval attempt failing (403) from the sponsor account. This is the strongest 90 seconds of the demo for a regulated buyer: the approver is a distinct, identity-bound human, enforced server-side.
5. **Governance surfaces.** Agent passports, audit trail (including `approvedByBoundReviewer`), sensitivity controls, one native-skill review output with cited evidence and reviewer escalation.
6. **Close on the boundary.** Human approval on every consequential output; no autonomous writeback, external send, filing, or payment. Then the pilot path: scorer -> sponsor/reviewer -> SOW (`docs/PILOT_SOW_TEMPLATE.md`).

## 4. Known Landmines (do not step on these)

4.1. **Subdomain fallbacks.** `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` fall back to `/dashboard/ceo`. Do not open them live. If asked, position them as the product family roadmap, demoed from the Nexus shell.

4.2. **72h claim TTL.** If the funnel workspace is prepared more than 72 hours before the demo, the claim code expires. Create the readiness submission the same day, or live on stage.

4.3. **In-memory fallback divergence.** A no-DB build cannot redeem claim codes and loses strategy profiles on restart. The demo must run against the real database; do not fall back to a local no-DB build if Render misbehaves — reschedule instead.

4.4. **Reviewer story (UPDATED 2026-07-09).** The identity-bound reviewer seat now EXISTS: invite flow, accepted-seat gate on the scorer, and approval rights restricted to the bound reviewer. Sell it. The remaining honest caveat: invite delivery email and seat-management polish are recent; if asked about org-wide roles/permissions beyond the reviewer seat, that is roadmap.

4.6. **Funnel page.** `/funnel` is operator-only and hidden from the nav by default. If you show it, show it deliberately from your operator account as "our own governed ops view" — never leave it open where a buyer reads global acquisition counts.

4.5. **No ROI claims.** The scorer's shadow plan language is the ceiling: measure first, claim after. Consistent with `docs/WORKFLOW_TWIN_SCORER.md` §AI Role.

## 5. Day-Of Checklist

- [ ] `/api/health` returns `status=ok`
- [ ] Deploy SHA matches `origin/main` (local main PUSHED — it was 6+ commits ahead on 2026-07-09)
- [ ] Migrations 0033-0037 applied
- [ ] Six-step smoke passed within the last 24h
- [ ] Reviewer seat accepted in the populated workspace; one approval made FROM the reviewer account (`approvedByBoundReviewer: true` in audit)
- [ ] Second device/profile logged into the reviewer account (Mode A) or Mode B locked at rehearsal
- [ ] Populated workspace: evidence processed (not pending), scorer run fresh, all gates clear
- [ ] Fresh readiness submission ready (or done live)
- [ ] Subdomain tabs closed; only the active app domain and current Nexus shell open
- [ ] Backup: screenshots of every walk step in case of network failure

## 6. Verification Snapshot — 2026-07-07

- Active verified pilot host in this run: `https://app.pinavia.co`
  (`NEXT_PUBLIC_APP_URL` remains the source of truth; do not hardcode the host
  in product logic).
- `.io` product domains were not resolving in this shell during the check.
  Record them as DNS/provider propagation pending, not as application failure.
- Public regulated-readiness flow, claim carry-over, and onboarding inheritance
  were verified live in a signed-in browser.
- The populated workspace showed the governed pilot state live:
  `Decision & Action Twin` selected, `pilot-ready`, and sponsor/reviewer/
  evidence gates all ready.
- Before the demo, re-run `docs/RELEASE_GATE_2026-07-07.md` section 9 after the
  middleware CORS-preflight fix is deployed so the domain smoke passes cleanly.
