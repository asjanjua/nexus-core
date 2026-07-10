# OAUTH_SETUP.md — Connector OAuth App Registration Guide

> Companion to `CONFIRM_NOW.md` Section 2.2. All 8 connectors (Google Drive, Gmail,
> SharePoint, Outlook Mail, GitHub, Jira, HubSpot, QuickBooks, LinkedIn) are
> code-complete and committed (`fffe3d0`, `0fb0780`). None has a real OAuth app
> behind it yet — until you register these, the connectors have no credentials
> to authenticate with and cannot pull live data. This is the one part of this
> rollout that has to be you: these are your developer accounts.

Before you start, confirm your live app URL (this is what `NEXT_PUBLIC_APP_URL`
is set to in Render — check Render dashboard → nexus-mission-control → Environment,
since it's marked `sync: false` and not stored in the repo). Every redirect URI
below assumes:

```
{APP_URL}/api/connectors/{type}/callback
```

Each connector has its own callback route, so where one provider backs two
connectors (Google, Microsoft), register both redirect URIs on the same app —
do not create two separate Google or Microsoft apps.

---

## 1. Google (backs Google Drive + Gmail)

**Where:** [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.

1. If you don't already have a Google Cloud project for Nexus, create one.
2. Enable the **Google Drive API** and **Gmail API** under APIs & Services → Library.
3. Configure the OAuth consent screen (External, unless you're staying in Google Workspace internal-only). Add scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
4. Create the OAuth client (Web application). Add **both** redirect URIs:
   - `{APP_URL}/api/connectors/google-drive/callback`
   - `{APP_URL}/api/connectors/gmail/callback`
5. Copy the Client ID and Client Secret into Render env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

Note: Drive is read-only file access, Gmail is read-only mail access. Nexus never writes to either.

---

## 2. Microsoft (backs SharePoint/Teams + Outlook Mail)

**Where:** [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App registrations → New registration.

1. Register a new app. Supported account type: choose based on whether you want this open to any Microsoft 365 tenant or just yours (multi-tenant is usually right for a product you'll sell to multiple clients).
2. Under Authentication, add a Web platform with **both** redirect URIs:
   - `{APP_URL}/api/connectors/sharepoint/callback`
   - `{APP_URL}/api/connectors/outlook-mail/callback`
3. Under API permissions, add Microsoft Graph delegated permissions:
   - `offline_access`
   - `User.Read`
   - `Mail.Read` (Outlook)
   - SharePoint/Teams scope per `lib/connectors/sharepoint.ts` (check the `SCOPE` constant if you want the exact string before requesting admin consent)
4. Create a Client Secret under Certificates & secrets. Copy:
   - `MICROSOFT_CLIENT_ID` (Application/client ID)
   - `MICROSOFT_CLIENT_SECRET` (the secret value, not the secret ID)
   - `MICROSOFT_TENANT_ID` (Directory/tenant ID, or `common` if multi-tenant)

If you're selling into client organizations, each client's Microsoft 365 admin will need to grant consent the first time someone there connects SharePoint or Outlook. Worth flagging in pilot onboarding paperwork.

---

## 3. GitHub

**Where:** [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → New OAuth App.

1. Application name: NexusAI Mission Control (or your pilot client's name if you register per-client).
2. Homepage URL: `{APP_URL}`
3. Authorization callback URL: `{APP_URL}/api/connectors/github/callback`
4. Generate a client secret. Copy:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

Scope requested at install time is `repo read:org read:user` (already hardcoded in `lib/connectors/github.ts`) — no action needed on scope, GitHub OAuth Apps don't require pre-declaring scopes the way GitHub Apps do.

---

## 4. Jira / Atlassian

**Where:** [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps) → Create → OAuth 2.0 integration.

1. Create the app, then under Permissions add the Jira API with scopes:
   - `read:jira-work`
   - `read:jira-user`
   - `offline_access`
2. Under Authorization, set the callback URL: `{APP_URL}/api/connectors/jira/callback`
3. Under Settings, copy:
   - `JIRA_CLIENT_ID`
   - `JIRA_CLIENT_SECRET`

Atlassian OAuth 2.0 (3LO) apps need to be submitted for the relevant scopes to go live for external users if you're distributing beyond your own Atlassian site — check the app's distribution status before a client pilot.

---

## 5. HubSpot

**Where:** [developers.hubspot.com](https://developers.hubspot.com) → your app (or create one) → Auth.

1. Create a public or private app depending on whether you'll connect multiple HubSpot portals (public app) or just your own (private app — simpler, but private apps use a different auth flow than OAuth; confirm `lib/connectors/hubspot.ts` is built against the OAuth flow before choosing private).
2. Redirect URL: `{APP_URL}/api/connectors/hubspot/callback`
3. Scopes (already hardcoded in the connector):
   - `crm.objects.deals.read`
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
4. Copy:
   - `HUBSPOT_CLIENT_ID`
   - `HUBSPOT_CLIENT_SECRET`

---

## 6. QuickBooks / Intuit

**Where:** [developer.intuit.com](https://developer.intuit.com) → My Apps → Create an app → QuickBooks Online and Payments.

1. Under Keys & OAuth, add the redirect URI: `{APP_URL}/api/connectors/quickbooks/callback`
2. Scope requested is `com.intuit.quickbooks.accounting` (already hardcoded, no action needed).
3. Copy the Development keys to start (Client ID, Client Secret), and note you'll need to apply for Production keys before a real client pilot — development keys only work against Intuit sandbox companies, not live QuickBooks accounts.
4. Set:
   - `QUICKBOOKS_CLIENT_ID`
   - `QUICKBOOKS_CLIENT_SECRET`
   - `QUICKBOOKS_ENVIRONMENT` — `sandbox` for now, `production` once you have production keys and a real pilot client

---

## 7. LinkedIn

**Where:** [developer.linkedin.com](https://developer.linkedin.com) → My Apps → Create app.

1. You'll need a LinkedIn Company Page to associate the app with (required by LinkedIn even for apps that won't post on the page's behalf).
2. Under Auth, add redirect URL: `{APP_URL}/api/connectors/linkedin/callback`
3. Scopes hardcoded in the connector: `r_organization_social rw_organization_admin`. These require LinkedIn's **Community Management API** product, which is gated, not self-serve. Apply for it under Products in the app dashboard — approval is not instant, budget time for this before promising a client a live LinkedIn connector.
4. Copy:
   - `LINKEDIN_CLIENT_ID`
   - `LINKEDIN_CLIENT_SECRET`

This is the one connector in the set where the credential step alone won't unblock you. Plan the Community Management API application as its own task with its own timeline, separate from the others which are same-day registrations.

---

## After registering: set the env vars in Render

Render dashboard → nexus-mission-control → Environment. Add each `_CLIENT_ID` /
`_CLIENT_SECRET` (and `MICROSOFT_TENANT_ID`, `QUICKBOOKS_ENVIRONMENT`) as
listed in `render.yaml`. These are marked `sync: false`, meaning Render expects
you to set the values directly in the dashboard, not via the YAML file — the
YAML just declares that the keys exist.

Once set, Render will need a redeploy for the new env vars to take effect on
the running service (Render usually does this automatically when env vars
change, but confirm against the dashboard).

---

## Suggested order

1. **GitHub, Jira, HubSpot** — same-day, no gated product applications, lowest friction. Do these first to get visible wins.
2. **Google, Microsoft** — same-day to register, but consent screens (especially Google's "External" verification if you go past 100 test users) can add review time later. Fine for pilot use under test-user limits now.
3. **QuickBooks** — same-day for sandbox; flag production keys as a separate task tied to your first real QuickBooks pilot client.
4. **LinkedIn** — register the app same-day, but treat the Community Management API approval as a separate, slower-moving task. Don't let it block the other six.

## Immediate next step

Start with GitHub, Jira, and HubSpot — fifteen minutes of admin gets three
connectors live with real data. Set those three env vars in Render, then come
back and we'll do an authenticated smoke test against `/settings/connectors`
before moving to Google and Microsoft.
