# Connector Setup Guide

Status: Active setup guide for the Mission Control connector catalogue.
Last updated: 2026-07-05.

This file lists every connector currently shown in Settings -> Connectors, including future connectors. Keep it aligned with `CONNECTOR_CATALOGUE` in `apps/mission-control/app/settings/connectors/page.tsx`.

Base redirect format:

```text
{NEXT_PUBLIC_APP_URL}/api/connectors/{connector}/callback
```

For production, `NEXT_PUBLIC_APP_URL` should be the live app URL or custom domain. For local testing, it should be the local tunnel or localhost URL registered with the provider.

## Connector Inventory

| Connector | Status | Setup link | Official docs | Redirect URI | Environment variables | Access / scope |
|---|---|---|---|---|---|---|
| Slack | Live OAuth | https://api.slack.com/apps | https://docs.slack.dev/authentication/installing-with-oauth | `{NEXT_PUBLIC_APP_URL}/api/connectors/slack/callback` | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL` | Channel messages, threads, users, and files for allowed channels |
| Google Drive | Live OAuth | https://console.cloud.google.com/apis/credentials | https://developers.google.com/identity/protocols/oauth2/web-server | `{NEXT_PUBLIC_APP_URL}/api/connectors/google-drive/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Drive files readable by the installing user |
| SharePoint / Teams | Live OAuth | https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade | https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app | `{NEXT_PUBLIC_APP_URL}/api/connectors/sharepoint/callback` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `NEXT_PUBLIC_APP_URL` | Microsoft 365 files visible through Graph |
| GitHub | Live OAuth | https://github.com/settings/developers | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app | `{NEXT_PUBLIC_APP_URL}/api/connectors/github/callback` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Repository issues and pull requests |
| Jira | Live OAuth | https://developer.atlassian.com/console/myapps/ | https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/ | `{NEXT_PUBLIC_APP_URL}/api/connectors/jira/callback` | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Jira Cloud issues and project metadata |
| HubSpot | Live OAuth | https://app.hubspot.com/developer | https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth | `{NEXT_PUBLIC_APP_URL}/api/connectors/hubspot/callback` | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Deal records only in the current implementation |
| QuickBooks | Live OAuth | https://developer.intuit.com/app/developer/myapps | https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/set-redirect-uri | `{NEXT_PUBLIC_APP_URL}/api/connectors/quickbooks/callback` | `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT`, `NEXT_PUBLIC_APP_URL` | QuickBooks Online invoices for the connected company file |
| LinkedIn | Live OAuth, gated by LinkedIn product approval | https://www.linkedin.com/developers/apps | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow | `{NEXT_PUBLIC_APP_URL}/api/connectors/linkedin/callback` | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Company-page posts when LinkedIn approves the required product access |
| Gmail | Live OAuth | https://console.cloud.google.com/apis/credentials | https://developers.google.com/workspace/gmail/api/auth/scopes | `{NEXT_PUBLIC_APP_URL}/api/connectors/gmail/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | Read-only mailbox messages |
| Outlook Mail | Live OAuth | https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade | https://learn.microsoft.com/en-us/graph/permissions-reference | `{NEXT_PUBLIC_APP_URL}/api/connectors/outlook-mail/callback` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `NEXT_PUBLIC_APP_URL` | Delegated Microsoft Graph `Mail.Read` mailbox messages |
| IMAP Email | Live manual connector | N/A | https://www.rfc-editor.org/rfc/rfc9051.html | No redirect URI | None | IMAP-over-TLS mailbox using host, port, username, and password/app password |
| Snowflake | Future | https://docs.snowflake.com/en/user-guide/oauth-custom | https://docs.snowflake.com/en/user-guide/oauth-custom | `{NEXT_PUBLIC_APP_URL}/api/connectors/snowflake/callback` | To be defined | Future governed warehouse tables |
| BigQuery | Future | https://console.cloud.google.com/apis/credentials | https://docs.cloud.google.com/bigquery/docs/authentication | `{NEXT_PUBLIC_APP_URL}/api/connectors/bigquery/callback` | To be defined | Future governed analytics datasets |
| Private Connector | Future scoped work | `mailto:hello@pinavia.io?subject=Nexus%20Private%20Connector%20Scoping` | N/A | To be defined | Custom per client | Internal databases and proprietary systems through a private sidecar |

## Setup Rules

### OAuth connectors

1. Create the provider app in the provider console.
2. Add the exact redirect URI shown above.
3. Copy the client ID and client secret into Render or the local environment.
4. Confirm the provider scopes match the current Nexus implementation.
5. Click Install in Nexus only after the provider app and environment variables are set.
6. After install, configure source policy before ingesting production data.

### Manual connectors

1. Confirm the source supports the protocol Nexus expects.
2. Enter only credentials created for this connector, not a personal master password when an app password is available.
3. Keep TLS enabled unless the deployment is a controlled local test.
4. Configure source sensitivity immediately after connection.

### Future connectors

Future connectors should not show an in-app install action until an implementation exists. Their CTAs should open setup/planning docs or a scoping contact, not a dead API route.

## Connector-Specific Notes

### Slack

- Start with an allowlist of channels.
- Do not ingest all public channels during demos unless the workspace is a controlled demo workspace.
- DMs remain blocked.

### Google Drive and Gmail

- These reuse the same Google OAuth client.
- Add both callback URLs if both connectors are enabled.
- Gmail scopes may require Google verification before broad production use.

### SharePoint / Teams and Outlook Mail

- These reuse the same Microsoft Entra app registration.
- Add both callback URLs if both connectors are enabled.
- Outlook Mail uses delegated `Mail.Read`; shared mailbox and tenant-wide access need separate design.

### LinkedIn

- OAuth install can succeed while post ingestion still fails if LinkedIn product access is not approved.
- Do not demo LinkedIn as fully live until the required LinkedIn product approval is confirmed.

### QuickBooks

- Use sandbox while testing.
- Switch `QUICKBOOKS_ENVIRONMENT` to production only for real customer company files.
- Current scope is invoices only; P&L, AR/AP aging, and balance-sheet reports are not yet built.

### Snowflake, BigQuery, and Private Connector

- These are future connectors.
- They need table/query allow-lists, sensitivity policy, credential storage design, and audit logging before implementation.
