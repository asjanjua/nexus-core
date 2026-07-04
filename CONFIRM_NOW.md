# CONFIRM_NOW.md — Pinavia Nexus Action List

> Current target: hardened demo stage in the next 48 hours. The detailed execution plan is `docs/PINAVIA_NEXUS_48H_HARDENED_DEMO_PLAN.md`. This file is the short action list for items that need login, account access, or a go/no-go decision. Last refreshed: 2026-07-04.

## 0. Current standing

- Local repo is on `main`; only this action-list paperwork and the 48-hour demo plan are currently uncommitted.
- Local HEAD is `26ae1ba` (`chore: add pinavia domain cutover smoke checks`).
- Latest commit added demo-domain cutover support: `NEXUS_EXTRA_CORS_ORIGINS`, `smoke:domain`, Pinavia env examples, and Render blueprint visibility.
- Live `/api/health` returned `status=ok` on 2026-07-04 with database, vector search, R2 originals, and DeepSeek configured.
- `APP_URL=https://nexus-mission-control.onrender.com npm run smoke:domain -w @nexus/mission-control` passed locally on 2026-07-04.
- Earlier local `tsc`, focused Vitest, and `build` commands hung silently in this shell and were stopped, so treat those gates as inconclusive until rerun cleanly.

---

## 1. Confirm deploy truth (do this first, blocks demo confidence)

1.1. Confirm `origin/main` matches local HEAD:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
git pull origin main
git rev-parse HEAD
git rev-parse origin/main
```

Expected HEAD: `26ae1ba`.

1.2. Log in to Render. Confirm the `nexus-mission-control` service deployed commit matches the same SHA. If it is behind, trigger a manual deploy from `main`.

1.3. Re-run health after deploy:

```bash
curl -sS https://nexus-mission-control.onrender.com/api/health | jq .
```

---

## 2. Authenticated demo smoke

Run this in a logged-in browser session because Clerk blocks unauthenticated curl:

- `/onboarding`
- upload/ingestion
- `/approvals`
- `/dashboard/ceo`
- Ask with evidence refs
- `/knowledge`
- Ask with note refs separate from evidence refs
- `/workflows`
- `/settings/connectors`
- `/pilot/paperwork` or Export Hub

Record blockers only if they would derail the demo.

---

## 3. Local verification retry

The right commands are still:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
npm exec -w @nexus/mission-control tsc -- --noEmit
npm run test
npm run build
APP_URL=https://nexus-mission-control.onrender.com npm run smoke:domain -w @nexus/mission-control
```

Today's shell hung on all three, so retry from the normal local terminal before the final demo freeze. If they hang again, diagnose the local Node/process issue separately from application correctness.

---

## 4. Operational gaps that need account access

4.1. Authenticate the `pinavia.io` sender domain in Resend or the selected managed email provider.

4.2. Set:

```text
NEXUS_RESEND_API_KEY=
NEXUS_FROM_EMAIL="Nexus <noreply@pinavia.io>"
```

4.3. Run one scheduled synthesis email test. Keep Clerk responsible for auth email verification/password reset.

4.4. Set up uptime monitoring for `/api/health`.

4.5. Confirm support/security contact route for the demo window.

4.6. Run a live security headers scan and capture the result.

---

## 5. Connector decisions only you can make

None of the 9 code-complete OAuth connectors (Google Drive, SharePoint/Teams, GitHub, Jira, HubSpot, QuickBooks, LinkedIn, Gmail, Outlook Mail) has been verified against a real OAuth app yet. This requires your developer accounts:

| Provider | Where to register | Env vars already in `render.yaml`/`CUTOVER.md` |
|---|---|---|
| Google (Drive + Gmail) | Google Cloud Console | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Microsoft (SharePoint + Outlook) | Azure AD app registration | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` |
| GitHub | github.com/settings/developers | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Jira/Atlassian | developer.atlassian.com | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET` |
| HubSpot | developers.hubspot.com | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` |
| QuickBooks/Intuit | developer.intuit.com | `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT` |
| LinkedIn | developer.linkedin.com | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` + separately apply for the Community Management API product (gates `files`/`ingest`, not install) |

   Redirect URI pattern for all: `{NEXT_PUBLIC_APP_URL}/api/connectors/{type}/callback`. Gmail and Outlook reuse the Google/Microsoft clients above, just add their own redirect URI to each.

IMAP Email needs a real mailbox to test against. No OAuth app needed, just a mailbox and credentials.

Figma Code Connect plan tier is already decided: no upgrade. Mappings are documented manually in `docs/UI_UX_WORKPLAN.md`.

---

## 6. What does NOT need demo-window attention

Everything else in `BACKLOG.md` (Knowledge graph filters, duplicate/contradiction audit, Ops Review Twin richer UI, design-to-code generation, connector scope expansion like aggregate Jira/HubSpot/QuickBooks rollups) is open product backlog with no external dependency. It will get worked through in normal sessions without needing your login or your accounts.
