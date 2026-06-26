# CONFIRM_NOW.md — Ali's Action List

> Distilled from `BACKLOG.md` (last reviewed 2026-06-26). This is not a new backlog, it is the subset of items that need YOUR action, login, or decision right now. Everything else in the backlog is engineering work that can proceed without you. Last generated: 2026-06-27.

---

## 1. Push and deploy (do this first, blocks everything else)

1.1. Push the local commits from your machine. The sandbox has no GitHub network access.

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
git pull origin main
git push origin main
```

Current local HEAD is `adabfe1` (paperwork), on top of `cc64239` (Step 5 Figma) and `d3aa1ce` (Step 4 live patterns). Confirm `origin/main` matches after push.

1.2. Log in to Render. Confirm the `nexus-mission-control` service deployed commit matches the new `origin/main` HEAD. If it is still on an older commit (last known: `9da3411`), trigger a manual deploy from `main`.

1.3. Once deployed, smoke test in a logged-in browser session (Clerk blocks unauthenticated curl, so this cannot be done headless):
- `/knowledge`
- `/workflows`
- `/settings/connectors`
- Ask note citations

---

## 2. Decisions only you can make

2.1. **Closed — both connector batches are committed and pushed.** This section previously flagged two stacked uncommitted batches; that is now stale. Your own verification run confirmed: `npm install` clean (510 packages, 0 vulnerabilities), `npm run test` passing 239/239 across 37 files, and `npm run build` succeeding across 135 pages with all 8 connector API routes present (github, jira, hubspot, quickbooks, linkedin, gmail, outlook-mail, imap). Git history confirms both batches are committed (`fffe3d0`, `0fb0780`) and `origin/main` is at `adabfe1`, matching local HEAD exactly. No action needed here.

   One open item from that run: `npx tsc --noEmit` printed the TypeScript CLI's help/usage text instead of a clean pass or an error list. That is not a valid signal either way, it means the command did not run as intended (likely needs workspace targeting in this monorepo). Re-run it as:

```bash
cd /Users/alijanjua/Documents/Playground/nexus-core
npm exec -w @nexus/mission-control tsc -- --noEmit
```

   and confirm it returns clean before treating typecheck as verified.

2.2. **OAuth app registrations** — none of the 9 connectors now code-complete (Google Drive, SharePoint/Teams, GitHub, Jira, HubSpot, QuickBooks, LinkedIn, Gmail, Outlook Mail) has been verified against a real OAuth app yet. This requires you personally, since it is your developer accounts:

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

2.3. **IMAP Email connector** needs a real mailbox to test against (any IMAP-over-TLS host: Gmail, Outlook, Spacemail, Hostinger, Zoho, self-hosted). No OAuth app needed, just a mailbox and credentials.

2.4. **Figma Code Connect plan tier** — already decided by you ("not upgrading"). No action needed, just flagging that this is now a closed decision, not an open one. Mappings are documented manually in `docs/UI_UX_WORKPLAN.md` instead.

---

## 3. Operational gaps that need an owner (not urgent, but unowned)

These are `open` in `BACKLOG.md` P1 and have no engineering blocker, they need a business decision or a few minutes of admin:

3.1. Set up `support@` and `security@` mailboxes (or equivalent), monitored.

3.2. Run securityheaders.com against the live app to confirm the A rating (header set is already built, just needs the live scan).

3.3. Confirm Neon daily backups are on and run one restore test (30-day retention target).

3.4. Decide if R2 bucket versioning is needed (only required if you're promising clients original-file recovery).

3.5. Document and publish the pilot SLA (4-hour response / 1-hour critical is in the current task text, needs to actually be in pilot paperwork).

3.6. Set up uptime monitoring on `/api/health`, dashboard, and ingestion route.

None of these block a pilot conversation, but all of them block signing one with eyes open.

---

## 4. What does NOT need your attention right now

Everything else in `BACKLOG.md` (Knowledge graph filters, duplicate/contradiction audit, Ops Review Twin richer UI, design-to-code generation, connector scope expansion like aggregate Jira/HubSpot/QuickBooks rollups) is open product backlog with no external dependency. It will get worked through in normal sessions without needing your login or your accounts.

---

## Immediate next step

Push and deploy (Section 1) first, since nothing else can be confirmed until `origin/main` and Render agree on a commit. Then tell me which of Section 2's two items you want next: the connector verification cycle, or the OAuth app registrations. I'd suggest the registrations first since they unblock real data flowing through connectors that are otherwise just code sitting idle.
