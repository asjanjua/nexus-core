# Pinavia Nexus 48-Hour Hardened Demo Plan

Last updated: 2026-07-04 11:35 PKT

## Target

Take Pinavia Nexus from "pilot/demo capable" to a hardened demo stage within 48 hours.

Hardened demo means:

- The live app is on the intended `main` commit.
- `/api/health` is green on the live URL.
- A logged-in Clerk browser session can complete the core demo path without a showstopper.
- The demo uses a known, seeded workspace and a rehearsed script.
- Product email, monitoring, support/security contact points, and rollback notes are configured or explicitly marked out of demo scope.
- No feature is presented as production-ready unless the live gate proves it.

## Current Standing

As of 2026-07-04:

- Repo: `main` with only this 48-hour demo plan and `CONFIRM_NOW.md` pending as paperwork edits.
- Local HEAD: `26ae1ba` (`chore: add pinavia domain cutover smoke checks`).
- Latest commit scope: domain-cutover demo hardening code/config — comma-separated CORS allowlist support, `smoke:domain`, Pinavia env examples, and `render.yaml` visibility for `NEXUS_EXTRA_CORS_ORIGINS`.
- Live health: `https://nexus-mission-control.onrender.com/api/health` returned `status=ok` at 2026-07-04 06:34 UTC with database, vector search, R2 originals, and DeepSeek configured.
- Known gap: live deployed commit still needs dashboard confirmation because `/api/health` does not expose commit SHA.
- Local domain smoke today: `APP_URL=https://nexus-mission-control.onrender.com npm run smoke:domain -w @nexus/mission-control` passed.
- Local verification today: `npm exec -w @nexus/mission-control tsc -- --noEmit`, focused Vitest, and `npm run build` hung silently in this shell and were stopped. Treat this as inconclusive, not a code failure. Last recorded full local pass remains the June 27 cycle after the connector/design batches.

## Demo Scope

Primary demo path:

1. Public entry and sign-in/sign-up through Clerk.
2. Onboarding and company context.
3. Upload or load demo evidence.
4. Approve or inspect evidence status.
5. CEO dashboard with command-center bridge, synthesis, trust drawer, nav health badges.
6. Ask a grounded question and show evidence refs.
7. Open `/knowledge`, create a markdown note, show backlinks/graph, then Ask against note content and show note refs separately.
8. Open `/workflows`, run scorer/backcasting, show shadow ROI capture.
9. Open `/settings/connectors`, show connector policy posture without claiming unverified OAuth flows are live.
10. Export or show pilot paperwork pack/value proof artifacts.

Explicitly out of demo scope unless separately verified:

- Live OAuth round trips for unverified connectors.
- LinkedIn ingest beyond OAuth install, because Community Management API approval gates real data.
- Voice, browser microphone, Whisper, Twilio, Deepgram, or audio storage.
- Autonomous writeback to source systems.
- Paid-pilot SLA claims until support/security, monitoring, backups, and restore are confirmed.

## 48-Hour Execution Plan

### Hours 0-4: Freeze and Deployment Truth

Goal: know exactly what code the demo is running.

- Confirm `origin/main` equals local HEAD `26ae1ba`.
- In Render, confirm `nexus-mission-control` deployed commit equals the same SHA.
- If Render is behind, trigger manual deploy from `main`.
- Confirm Render env essentials:
  - `NEXUS_ENV=pilot`
  - `NEXT_PUBLIC_APP_URL` is the live URL
  - `NEXUS_DB_REQUIRED=true`
  - `NEXUS_LLM_PROVIDER=deepseek`
  - `NEXUS_LLM_MODEL=deepseek-v4-flash` or `deepseek-v4-pro`
  - `NEXUS_VECTOR_SEARCH=enabled`
  - `NEXUS_R2_ORIGINALS=enabled`
  - `NEXUS_VAULT_SYNC=disabled`
- Add the demo custom domain in Render:
  - preferred host: `app.pinavia.io`
  - set `NEXT_PUBLIC_APP_URL=https://app.pinavia.io` after SSL is verified
  - optionally set `NEXUS_EXTRA_CORS_ORIGINS=https://nexus-mission-control.onrender.com` during the cutover window
- Re-run live `/api/health` after deploy.
- Re-run the domain smoke:

```bash
APP_URL=https://app.pinavia.io EXPECT_CORS_ORIGIN=https://app.pinavia.io npm run smoke:domain -w @nexus/mission-control
```

- Capture the exact deploy SHA, health timestamp, and any degraded check in `HANDOVER.md`.

Exit gate:

- Live app health is green after the intended SHA is deployed, or rollback decision is made.

### Hours 4-12: Authenticated Smoke and Demo Script

Goal: prove the user-visible path in a logged-in session.

- Smoke Clerk sign-in/sign-up and password reset/verification settings.
- Use one dedicated demo workspace, not a personal messy workspace.
- Run the full browser path:
  - `/onboarding`
  - upload/ingestion
  - `/approvals`
  - `/dashboard/ceo`
  - Ask: `What are the top risks right now?`
  - `/knowledge`
  - Ask against a saved note
  - `/workflows`
  - `/settings/connectors`
  - `/pilot/paperwork` or Export Hub
- Record failures as P0 only if they block the script.
- Do not chase cosmetic issues unless they break trust, layout, or navigation.

Exit gate:

- One complete logged-in demo run is recorded with pass/fail notes and screenshots where useful.

### Hours 12-20: Fix Demo Killers Only

Goal: eliminate blockers found during smoke.

P0 fix rules:

- Broken auth redirect.
- Upload cannot complete or evidence status is unclear.
- Dashboard crashes or empty synthesis is unhandled.
- Ask returns empty output, no evidence/note trail, or provider failure is not visible.
- Knowledge note save/preview/graph fails.
- Workflow scorer/backcast path cannot render.
- Connector settings page crashes.
- Pilot paperwork pack cannot render.

Verification after each fix:

- Run the narrowest relevant test first.
- Then rerun the affected browser step.
- Avoid broad refactors unless a blocker proves they are needed.

Exit gate:

- No known P0 blockers remain in the demo path.

### Hours 20-28: Operational Hardening

Goal: remove obvious trust gaps around the live demo.

- Authenticate `pinavia.io` sender domain in Resend or chosen managed provider.
- Set `NEXUS_RESEND_API_KEY` and `NEXUS_FROM_EMAIL`.
- Run one scheduled synthesis email delivery test.
- Confirm Clerk remains the owner of auth email; do not build custom auth confirmation.
- Configure Sentry DSN if the project exists; otherwise document as intentionally deferred for this demo.
- Set up uptime monitoring for `/api/health`.
- Confirm support/security contact route:
  - monitored `support@...` and `security@...`, or
  - explicit temporary owner and inbox for the demo window.
- Run a live security headers scan and capture the result.

Exit gate:

- Product email works or is explicitly disabled for the demo.
- Monitoring/contact path is real enough for a serious prospect conversation.

### Hours 28-36: Demo Data and Narrative Polish

Goal: make the demo feel intentional, not improvised.

- Choose one buyer lane and one first workflow:
  - recommended: regulated fintech/advisory workflow with governed evidence and human review.
- Prepare a compact evidence bundle:
  - board pack or strategy PDF
  - risk register
  - operational KPI markdown or spreadsheet
  - regulatory/compliance update
- Seed or upload those files into the demo workspace.
- Create one Knowledge note with:
  - a `[[wikilink]]`
  - a `#tag`
  - one Nexus evidence/entity reference
- Pre-rehearse the questions:
  - `What are the top risks right now?`
  - `What decision needs my attention this week?`
  - `What source evidence supports this recommendation?`
  - `What changed in the workflow pilot scope?`
- Prepare a fallback demo path using existing demo packs if live upload is slow.

Exit gate:

- Demo workspace has enough grounded evidence and notes to avoid generic answers.

### Hours 36-44: Final Regression and Freeze

Goal: stop changing the product and prove the final path.

- Rerun live `/api/health`.
- Rerun the full logged-in demo script.
- Confirm no secrets are printed in UI or logs.
- Confirm protected API routes reject unauthenticated calls.
- Confirm hosted Render still has `NEXUS_VAULT_SYNC=disabled`.
- Confirm fallback/rollback:
  - last good Render deploy identified
  - current commit SHA recorded
  - demo pack fallback ready
- Freeze non-critical changes.

Exit gate:

- One full clean demo rehearsal after freeze.

### Hours 44-48: Go/No-Go Packet

Goal: know exactly what can be shown and what must be caveated.

Create a short demo packet with:

- Live URL.
- Commit SHA.
- Health timestamp.
- Demo account/workspace.
- Demo script.
- Known caveats.
- Owner for any operational item still open.
- Rollback plan.

Go if:

- Live health is green.
- Authenticated demo script passes.
- Ask and Knowledge cite evidence/notes correctly.
- Product email is either verified or explicitly omitted from the demo.
- No P0 blocker remains.

No-go or limited demo if:

- Render is not on the intended commit.
- Clerk auth blocks the demo account.
- Ask is empty or uncited.
- Upload/Knowledge/Workflow path crashes.
- Live health is degraded.

## Workstreams and Owners

| Workstream | Owner | Current status | 48-hour action |
|---|---|---|---|
| Deploy truth | Ali + Codex | Health green, commit unconfirmed live | Confirm Render SHA, redeploy if behind |
| Browser smoke | Codex with logged-in browser, or Ali if account-gated | Pending | Run full demo path |
| Local gates | Codex/Ali | Today's shell hung; last recorded pass Jun 27 | Reproduce deterministic typecheck/test/build or document runner issue |
| Email boundary | Ali | Code/docs ready, provider config open | Authenticate sender, set Resend env, send test |
| Monitoring | Ali | Sentry wired but env optional; uptime open | Set Sentry if available, add uptime monitor |
| Demo data | Codex | Demo packs exist | Seed chosen workspace and rehearse questions |
| Security posture | Codex/Ali | Headers code covered; live scan open | Run live scan, verify auth rejection |
| Connector claims | Codex | Many connectors code-complete but OAuth-unverified | Demo policy UI only; avoid live connector claims |

## Immediate Next Commands

Local, from repo root:

```bash
git status --short
git rev-parse HEAD
npm exec -w @nexus/mission-control tsc -- --noEmit
npm run test
npm run build
APP_URL=https://nexus-mission-control.onrender.com npm run smoke:domain -w @nexus/mission-control
curl -sS https://nexus-mission-control.onrender.com/api/health | jq .
```

Render/Clerk/browser actions:

- Confirm deployed SHA in Render.
- Confirm Clerk live redirect URLs.
- Run the authenticated demo path.
- Record the result in `HANDOVER.md`.
