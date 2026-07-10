# Regulated-Enterprise Demo Runbook

Status: Operational runbook for the live regulated-buyer demo (target: week of 2026-07-13).
Companion to `docs/RELEASE_GATE_2026-07-07.md` (executable cutover) and `docs/PRODUCTION_HEALTH_CHECKLIST.md`.
Audience for the demo: bank/fintech buyer. Governance boundaries, evidence trail, and human approval are the product.

## 1. Pre-Demo Cutover (external actions — Ali at the keyboard)

Run `docs/RELEASE_GATE_2026-07-07.md` end to end. Summary of the non-negotiables:

1.1. Apply migrations `0033` and `0034` against the production Neon database (idempotent runner). Without them the readiness claim and scorer snapshot silently degrade.

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

Then, in the populated workspace: run Ask twice so citations exist, approve at least one recommendation so the approval trail is visible, set sponsor and reviewer names on the strategy profile, run the workflow scorer (signal should read `moderate` or better), and run one native-skill review (evidence grid or Meridian compliance) from Settings so a governed agent output exists.

## 3. Demo Walk Order

1. **Readiness assessment** (public, no login). Pick financial services sector -> lane assigns `regulated_enterprise` server-side. Say: the client never chooses their own lane.
2. **Claim -> signup -> onboarding.** Show the lane banner inheriting context; show that leaving the regulated lane requires explicit confirmation. This is the governed-lifecycle story.
3. **Scorer in the fresh workspace.** Show the provisional-signal line under the recommendation. Talking point: the system labels how much customer signal backs its own recommendation — it knows what it does not know.
4. **Switch to the populated workspace.** Mission Control pilot-status card (lane, band, sponsor, reviewer, gates, signal), evidence with source trail, Ask with citations, approval queue.
5. **Governance surfaces.** Agent passports, audit trail, sensitivity controls, one native-skill review output with cited evidence and reviewer escalation.
6. **Close on the boundary.** Human approval on every consequential output; no autonomous writeback, external send, filing, or payment. Then the pilot path: scorer -> sponsor/reviewer -> SOW (`docs/PILOT_SOW_TEMPLATE.md`).

## 4. Known Landmines (do not step on these)

4.1. **Subdomain fallbacks.** `meridian.pinavia.io`, `vantage.pinavia.io`, and `nucleus.pinavia.io` fall back to `/dashboard/ceo`. Do not open them live. If asked, position them as the product family roadmap, demoed from the Nexus shell.

4.2. **72h claim TTL.** If the funnel workspace is prepared more than 72 hours before the demo, the claim code expires. Create the readiness submission the same day, or live on stage.

4.3. **In-memory fallback divergence.** A no-DB build cannot redeem claim codes and loses strategy profiles on restart. The demo must run against the real database; do not fall back to a local no-DB build if Render misbehaves — reschedule instead.

4.4. **Reviewer honesty.** If asked "does the reviewer log in?": the truthful answer is that the reviewer is a named accountability field today, and an identity-bound reviewer seat is scheduled before pilot start (`BACKLOG.md` P1). Do not imply the seat exists.

4.5. **No ROI claims.** The scorer's shadow plan language is the ceiling: measure first, claim after. Consistent with `docs/WORKFLOW_TWIN_SCORER.md` §AI Role.

## 5. Day-Of Checklist

- [ ] `/api/health` returns `status=ok`
- [ ] Deploy SHA matches `origin/main`
- [ ] Six-step smoke passed within the last 24h
- [ ] Populated workspace: evidence processed (not pending), scorer run fresh, one approval in trail
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
