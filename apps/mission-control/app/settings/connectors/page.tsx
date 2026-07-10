"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { HelpLabel } from "@/components/ui/help-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectorRecord = {
  id: string;
  workspaceId: string;
  type: string;
  status: string;
  installedBy: string;
  installedAt: string;
  lastSyncAt?: string;
  syncError?: string;
  config: Record<string, unknown>;
};

type ConnectorPolicyDraft = {
  allowedChannels: string;
  ingestAllPublicChannels: boolean;
  defaultSensitivity: "public" | "internal" | "confidential" | "restricted";
  maxSensitivity: "public" | "internal" | "confidential" | "restricted";
  sourcePolicy: "read_only" | "manual_review" | "disabled";
  notes: string;
};

// ---------------------------------------------------------------------------
// Static connector catalogue
// ---------------------------------------------------------------------------

type ConnectorDef = {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  installHref: string;
  setupHref?: string;
  docsHref?: string;
  available: boolean;
  lane: "saas" | "warehouse" | "private";
  envVars?: string[];
  redirectPath?: string;
  scopes?: string[];
  dataScope: string;
  setupNotes: string[];
  /** "oauth" (default) renders an Install link. "manual" renders an inline connect form (IMAP). */
  connectKind?: "oauth" | "manual";
};

const CONNECTOR_CATALOGUE: ConnectorDef[] = [
  {
    type: "slack",
    name: "Slack",
    description: "Ingest messages, threads, and files from your team workspace.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
    installHref: "/api/connectors/slack/install",
    setupHref: "https://api.slack.com/apps",
    docsHref: "https://docs.slack.dev/authentication/installing-with-oauth",
    available: true,
    lane: "saas",
    envVars: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/slack/callback",
    scopes: ["channels:history", "channels:read", "groups:history", "groups:read", "users:read", "files:read"],
    dataScope: "Team messages, threads, and files from allowed channels only. DMs are blocked by policy.",
    setupNotes: [
      "Create a Slack app, add the OAuth redirect URL, and install it to the target workspace.",
      "Add only the scopes Nexus needs for read-only evidence ingestion.",
      "After install, configure allowed channel IDs before enabling broad ingestion.",
    ],
  },
  {
    type: "google-drive",
    name: "Google Drive",
    description: "Pull Docs, Sheets, Slides, and PDFs from shared drives.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4.433 22.396L0 15.047l4.433-7.676h15.135L24 15.047l-4.432 7.349H4.433zm4.051-14.72L4.05 15.047l4.433 7.349h7.036l4.432-7.349-4.432-7.372H8.484zM12 0l4.432 7.676H7.568L12 0z" />
      </svg>
    ),
    installHref: "/api/connectors/google-drive/install",
    setupHref: "https://console.cloud.google.com/apis/credentials",
    docsHref: "https://developers.google.com/identity/protocols/oauth2/web-server",
    available: true,
    lane: "saas",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/google-drive/callback",
    scopes: ["drive.readonly", "userinfo.email"],
    dataScope: "Google Docs, Sheets, Slides, PDFs, and other files the installing user can read.",
    setupNotes: [
      "Create or reuse a Google Cloud OAuth web client.",
      "Add the Google Drive redirect URI exactly as shown below.",
      "Keep the app in testing mode for early demos, or complete Google verification before broad customer use.",
    ],
  },
  {
    type: "sharepoint",
    name: "SharePoint / Teams",
    description: "Ingest documents and wikis from Microsoft 365 environments.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M11.5 0A5.5 5.5 0 0 0 6 5.5a5.5 5.5 0 0 0 5.5 5.5A5.5 5.5 0 0 0 17 5.5 5.5 5.5 0 0 0 11.5 0zm0 2A3.5 3.5 0 0 1 15 5.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8 5.5 3.5 3.5 0 0 1 11.5 2zM6.5 12A4.5 4.5 0 0 0 2 16.5V22h2v-5.5A2.5 2.5 0 0 1 6.5 14H13a2.5 2.5 0 0 1 2.5 2.5V22h2v-5.5A4.5 4.5 0 0 0 13 12z" />
      </svg>
    ),
    installHref: "/api/connectors/sharepoint/install",
    setupHref: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    docsHref: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
    available: true,
    lane: "saas",
    envVars: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/sharepoint/callback",
    scopes: ["Files.Read", "offline_access", "User.Read"],
    dataScope: "Microsoft 365 files visible through the connected user's OneDrive/SharePoint drive access.",
    setupNotes: [
      "Register an app in Microsoft Entra ID and add a Web redirect URI.",
      "Create a client secret and copy the client ID, secret, and tenant setting into Render.",
      "Use tenant-specific IDs for controlled pilots; use common only when multi-tenant install is intentional.",
    ],
  },
  {
    type: "github",
    name: "GitHub",
    description: "Ingest issues and pull requests from your repositories.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    installHref: "/api/connectors/github/install",
    setupHref: "https://github.com/settings/developers",
    docsHref: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
    available: true,
    lane: "saas",
    envVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/github/callback",
    scopes: ["repo"],
    dataScope: "Repository list plus issue and pull-request evidence for repositories the installing user can access.",
    setupNotes: [
      "Create a GitHub OAuth app and set the Authorization callback URL to the Nexus redirect URI.",
      "Use the narrowest repo access that fits the pilot account.",
      "Current Nexus scope is issue/PR evidence; CI and deployment rollups are still future work.",
    ],
  },
  {
    type: "jira",
    name: "Jira",
    description: "Pull issues and project metadata from Atlassian Jira Cloud.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M11.53 2L2 11.53a1.5 1.5 0 0 0 0 2.12l3.18 3.18 6.35-6.35L18 4.12 14.82.94a1.5 1.5 0 0 0-2.12 0L11.53 2zM5.18 11.53l6.35 6.35-3.18 3.18a1.5 1.5 0 0 1-2.12 0L2.85 17.7a1.5 1.5 0 0 1 0-2.12l2.33-2.05zm12.7-3.18L11.53 14.7l3.18 3.18a1.5 1.5 0 0 0 2.12 0l3.38-3.38a1.5 1.5 0 0 0 0-2.12l-2.33-2.03z" />
      </svg>
    ),
    installHref: "/api/connectors/jira/install",
    setupHref: "https://developer.atlassian.com/console/myapps/",
    docsHref: "https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/",
    available: true,
    lane: "saas",
    envVars: ["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/jira/callback",
    scopes: ["read:jira-work", "read:jira-user", "offline_access"],
    dataScope: "Jira Cloud issue metadata and descriptions from accessible Jira sites.",
    setupNotes: [
      "Create an Atlassian OAuth 2.0 (3LO) app and enable Jira API scopes.",
      "Add the callback URL under Authorization for OAuth 2.0 (3LO).",
      "The first install resolves an accessible cloud site; users without Jira site access cannot ingest issues.",
    ],
  },
  {
    type: "hubspot",
    name: "HubSpot",
    description: "Ingest deals, contacts, and companies from your CRM pipeline.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.265-1.978v-.066A2.2 2.2 0 0 0 17.23.84h-.067a2.2 2.2 0 0 0-2.199 2.2v.066a2.198 2.198 0 0 0 1.266 1.978V7.93a6.235 6.235 0 0 0-2.969 1.31L7.04 4.6A2.474 2.474 0 0 0 7.1 4.07a2.49 2.49 0 1 0-2.49 2.49c.193 0 .378-.027.555-.066l6.103 4.59a6.24 6.24 0 0 0 .054 6.984l-1.857 1.857a2.01 2.01 0 0 0-.585-.094 2.024 2.024 0 1 0 2.024 2.024c0-.207-.034-.404-.094-.586l1.84-1.84a6.236 6.236 0 1 0 5.07-11.498zm-1.034 9.367a3.135 3.135 0 1 1 0-6.27 3.135 3.135 0 0 1 0 6.27z" />
      </svg>
    ),
    installHref: "/api/connectors/hubspot/install",
    setupHref: "https://app.hubspot.com/developer",
    docsHref: "https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth",
    available: true,
    lane: "saas",
    envVars: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/hubspot/callback",
    scopes: ["crm.objects.deals.read"],
    dataScope: "HubSpot deal records for CRM evidence. Contact and activity history remain future scope.",
    setupNotes: [
      "Create a HubSpot public app, add the redirect URL, and request read access for CRM deal objects.",
      "Use a test/developer account first so the consent screen and scopes are correct before demos.",
      "Current Nexus scope is deals only; do not present this as full CRM ingestion yet.",
    ],
  },
  {
    type: "quickbooks",
    name: "QuickBooks",
    description: "Ingest invoices, P&L, and accounting records for finance evidence.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM7.5 16.5a4.5 4.5 0 1 1 0-9 4.508 4.508 0 0 1 1.5.258V12a3 3 0 1 0 3 3v3.75a4.5 4.5 0 0 1-4.5-2.25zm9-4.5a4.5 4.5 0 1 1-4.5-4.5V4.5A4.5 4.5 0 0 1 16.5 9v3z" />
      </svg>
    ),
    installHref: "/api/connectors/quickbooks/install",
    setupHref: "https://developer.intuit.com/app/developer/myapps",
    docsHref: "https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/set-redirect-uri",
    available: true,
    lane: "saas",
    envVars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET", "QUICKBOOKS_ENVIRONMENT", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/quickbooks/callback",
    scopes: ["com.intuit.quickbooks.accounting"],
    dataScope: "QuickBooks Online invoice evidence from the connected company file. Full P&L/AR/AP reports are future scope.",
    setupNotes: [
      "Create an Intuit app and choose QuickBooks Online Accounting access.",
      "Set the redirect URI in both development and production settings as needed.",
      "Use sandbox for test files; switch QUICKBOOKS_ENVIRONMENT to production only for real customer companies.",
    ],
  },
  {
    type: "linkedin",
    name: "LinkedIn",
    description: "Ingest company-page posts and social signals (requires LinkedIn partner approval).",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    installHref: "/api/connectors/linkedin/install",
    setupHref: "https://www.linkedin.com/developers/apps",
    docsHref: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
    available: true,
    lane: "saas",
    envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/linkedin/callback",
    scopes: ["openid", "profile", "w_organization_social"],
    dataScope: "Company-page social posts and signals when LinkedIn product approval allows access.",
    setupNotes: [
      "Create a LinkedIn developer app and add the redirect URL in Auth settings.",
      "Request the LinkedIn product needed for organization/community management access before expecting post ingestion to work.",
      "OAuth install can succeed before data access is approved; files/ingest may still fail with LinkedIn permission errors.",
    ],
  },
  {
    type: "gmail",
    name: "Gmail",
    description: "Ingest mailbox content (read-only) from a Google Workspace or personal Gmail account.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.825L12 11.273l9.539-7.452h.825A1.636 1.636 0 0 1 24 5.457z" />
      </svg>
    ),
    installHref: "/api/connectors/gmail/install",
    setupHref: "https://console.cloud.google.com/apis/credentials",
    docsHref: "https://developers.google.com/workspace/gmail/api/auth/scopes",
    available: true,
    lane: "saas",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/gmail/callback",
    scopes: ["gmail.readonly", "userinfo.email"],
    dataScope: "Read-only Gmail messages from the connected mailbox. Attachments and thread rollups are future scope.",
    setupNotes: [
      "Reuse the Google OAuth client used for Google Drive, then add this Gmail callback URI too.",
      "Enable the Gmail API and request the read-only Gmail scope.",
      "Gmail scopes can trigger Google verification requirements before broad production use.",
    ],
  },
  {
    type: "outlook-mail",
    name: "Outlook Mail",
    description: "Ingest mailbox content (read-only) from Outlook.com or Microsoft 365 / Exchange Online.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M24 7.387v9.226c0 .397-.32.717-.717.717h-6.39V6.67h6.39c.397 0 .717.32.717.717zM15.6 6.67H1.44a.72.72 0 0 0-.72.72v9.22a.72.72 0 0 0 .72.72H15.6V6.67zM8.52 9.07a3.05 3.05 0 1 1 0 6.1 3.05 3.05 0 0 1 0-6.1z" />
      </svg>
    ),
    installHref: "/api/connectors/outlook-mail/install",
    setupHref: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    docsHref: "https://learn.microsoft.com/en-us/graph/permissions-reference",
    available: true,
    lane: "saas",
    envVars: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID", "NEXT_PUBLIC_APP_URL"],
    redirectPath: "/api/connectors/outlook-mail/callback",
    scopes: ["Mail.Read", "offline_access", "User.Read"],
    dataScope: "Read-only Outlook.com or Microsoft 365 mailbox messages for the signed-in user.",
    setupNotes: [
      "Reuse the Azure app registration used for SharePoint, then add this Outlook callback URI too.",
      "Add delegated Microsoft Graph Mail.Read permission and grant admin consent if your tenant requires it.",
      "For shared mailbox or all-mailbox access, scope and policy need a separate enterprise design pass.",
    ],
  },
  {
    type: "imap",
    name: "IMAP Email",
    description: "Connect any IMAP-over-TLS mailbox (Spacemail, Hostinger, Zoho, self-hosted, etc.) with server settings — no OAuth required.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.01L12 13 22 6.01V6H2zm0 2.5V18h20V8.5l-10 6.5-10-6.5z" />
      </svg>
    ),
    installHref: "",
    docsHref: "https://www.rfc-editor.org/rfc/rfc9051.html",
    available: true,
    lane: "saas",
    envVars: [],
    scopes: ["Mailbox username/password or app password"],
    dataScope: "Any standards-compliant IMAP-over-TLS mailbox. Nexus stores credentials encrypted at rest.",
    setupNotes: [
      "No OAuth app or environment variables are required.",
      "Use the mail host's IMAP server, port 993, TLS enabled, and an app password where available.",
      "Do not use POP3; the connector is intentionally IMAP-only.",
    ],
    connectKind: "manual",
  },
  {
    type: "snowflake",
    name: "Snowflake",
    description: "Query tables directly via warehouse connector for structured data ingest.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M11 0v3.35L8.5 1.4 7.1 2.8 11 6.64V11H6.64L2.8 7.1 1.4 8.5 3.35 11H0v2h3.35L1.4 15.5l1.4 1.4L6.64 13H11v4.36L7.1 21.2l1.4 1.4 2.5-1.95V24h2v-3.35l2.5 1.95 1.4-1.4L17.36 17H22v-2h-4.64L21.2 10.9l-1.4-1.4-3.8 3.86V9h-2V7.1l3.8-3.86-1.4-1.4L13 3.79V0z" />
      </svg>
    ),
    installHref: "/api/connectors/snowflake/install",
    setupHref: "https://docs.snowflake.com/en/user-guide/oauth-custom",
    docsHref: "https://docs.snowflake.com/en/user-guide/oauth-custom",
    available: false,
    lane: "warehouse",
    envVars: [],
    redirectPath: "/api/connectors/snowflake/callback",
    scopes: ["Warehouse/database role to be defined"],
    dataScope: "Future structured warehouse ingestion for governed tables and analytics data.",
    setupNotes: [
      "Not implemented in Nexus yet; do not use the internal install path for demos.",
      "Snowflake setup will require a security integration, redirect URI, role mapping, and query allow-list.",
      "Scope this only after the first pilot has a clear table-level data need.",
    ],
  },
  {
    type: "bigquery",
    name: "BigQuery",
    description: "Connect Google BigQuery datasets for analytics data ingestion.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M3.2 4.8L0 12l3.2 7.2h17.6L24 12l-3.2-7.2H3.2zm1.6 2.4h13.6L21.2 12l-2.8 4.8H5.6L2.8 12l2-4.8z" />
      </svg>
    ),
    installHref: "/api/connectors/bigquery/install",
    setupHref: "https://console.cloud.google.com/apis/credentials",
    docsHref: "https://docs.cloud.google.com/bigquery/docs/authentication",
    available: false,
    lane: "warehouse",
    envVars: [],
    redirectPath: "/api/connectors/bigquery/callback",
    scopes: ["BigQuery read scope to be defined"],
    dataScope: "Future structured analytics ingestion from selected BigQuery datasets.",
    setupNotes: [
      "Not implemented in Nexus yet; do not use the internal install path for demos.",
      "BigQuery setup will need a Google Cloud OAuth client or service-account architecture decision.",
      "Add only after table selection, data classification, and query boundaries are designed.",
    ],
  },
  {
    type: "private",
    name: "Private Connector",
    description: "Docker/K8s sidecar for internal databases and proprietary systems.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 7c2.67 0 8 1.34 8 4v1H4v-1c0-2.66 5.33-4 8-4z" />
      </svg>
    ),
    installHref: "/api/connectors/private/install",
    setupHref: "mailto:hello@pinavia.io?subject=Nexus%20Private%20Connector%20Scoping",
    available: false,
    lane: "private",
    envVars: [],
    scopes: ["Custom per client"],
    dataScope: "Future private sidecar connector for internal databases and proprietary systems.",
    setupNotes: [
      "Not implemented as a self-serve connector.",
      "Requires architecture scoping: network location, credential handling, query allow-list, audit logging, and deployment model.",
      "Use this only for enterprise/on-prem pilots after the cloud workflow is proven.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-green-500/40 bg-green-500/10 text-green-300",
    revoked: "border-red-400/40 bg-red-400/10 text-red-300",
    error: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    pending: "border-white/20 bg-white/5 text-white/40",
  };
  const style = styles[status] ?? styles.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${style}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Connector row
// ---------------------------------------------------------------------------

type ImapConnectDraft = {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  label: string;
};

const EMPTY_IMAP_DRAFT: ImapConnectDraft = {
  host: "",
  port: "993",
  secure: true,
  username: "",
  password: "",
  label: "",
};

function ConnectorRow({
  def,
  record,
  onRevoke,
  onSavePolicy,
  onConnectImap,
  revoking,
  saving,
  connectingImap,
}: {
  def: ConnectorDef;
  record?: ConnectorRecord;
  onRevoke: (type: string) => void;
  onSavePolicy: (type: string, draft: ConnectorPolicyDraft) => void;
  onConnectImap: (draft: ImapConnectDraft) => void;
  revoking: string | null;
  saving: string | null;
  connectingImap: boolean;
}) {
  const isActive = record?.status === "active";
  const isRevoked = record?.status === "revoked";
  const isInstalled = !!record && !isRevoked;
  const config = record?.config ?? {};
  const [policyOpen, setPolicyOpen] = useState(false);
  const [draft, setDraft] = useState<ConnectorPolicyDraft>({
    allowedChannels: Array.isArray(config.allowedChannels)
      ? config.allowedChannels.join(", ")
      : "",
    ingestAllPublicChannels: config.ingestAllPublicChannels === true,
    defaultSensitivity:
      config.defaultSensitivity === "public" ||
      config.defaultSensitivity === "internal" ||
      config.defaultSensitivity === "confidential" ||
      config.defaultSensitivity === "restricted"
        ? config.defaultSensitivity
        : "internal",
    maxSensitivity:
      config.maxSensitivity === "public" ||
      config.maxSensitivity === "internal" ||
      config.maxSensitivity === "confidential" ||
      config.maxSensitivity === "restricted"
        ? config.maxSensitivity
        : "confidential",
    sourcePolicy:
      config.sourcePolicy === "manual_review" || config.sourcePolicy === "disabled"
        ? config.sourcePolicy
        : "read_only",
    notes: typeof config.notes === "string" ? config.notes : "",
  });
  const [imapDraft, setImapDraft] = useState<ImapConnectDraft>(EMPTY_IMAP_DRAFT);
  const [imapFormOpen, setImapFormOpen] = useState(false);
  const externalAttrs = { target: "_blank", rel: "noreferrer" };

  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Icon */}
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent"
            : "border-white/10 bg-white/5 text-white/40",
        ].join(" ")}
      >
        {def.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white">{def.name}</p>
          {record && <StatusBadge status={record.status} />}
          {!def.available && !record && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/30">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5">{def.description}</p>

        {isActive && record && (
          <>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/40">
              <span>Installed: {new Date(record.installedAt).toLocaleDateString()}</span>
              {typeof record.config?.teamName === "string" && (
                <span>Team: {record.config.teamName}</span>
              )}
              <span>
                Last sync: {record.lastSyncAt ? new Date(record.lastSyncAt).toLocaleString() : "Not yet synced"}
              </span>
              <span>
                <HelpLabel
                  title="Connector max sensitivity"
                  help="This is the highest sensitivity level this connector may ingest. Anything above the limit should be blocked or held back by policy."
                >
                  Max sensitivity: {String(record.config?.maxSensitivity ?? "confidential")}
                </HelpLabel>
              </span>
              <span>
                Channels: {Array.isArray(record.config?.allowedChannels) && record.config.allowedChannels.length
                  ? record.config.allowedChannels.join(", ")
                  : record.config?.ingestAllPublicChannels ? "All public channels" : "None selected"}
              </span>
            </div>
            <button
              className="mt-3 text-xs text-nexus-accent hover:underline"
              onClick={() => setPolicyOpen((value) => !value)}
            >
              {policyOpen ? "Hide source policy" : "Configure source policy"}
            </button>
            {policyOpen && (
              <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                {def.type === "slack" && (
                  <>
                    <div className="space-y-1">
                      <span className="text-white/50">
                        <HelpLabel
                          title="Allowed Slack channel IDs"
                          help="Only messages from these Slack channels can become evidence. Use this to keep pilots focused and avoid pulling unrelated conversations into Nexus."
                        >
                          Allowed Slack channel IDs
                        </HelpLabel>
                      </span>
                      <input
                        aria-label="Allowed Slack channel IDs"
                        className="input"
                        value={draft.allowedChannels}
                        onChange={(event) => setDraft({ ...draft, allowedChannels: event.target.value })}
                        placeholder="C0123, C0456"
                      />
                      <span className="block text-white/30">Only these channels become evidence. DMs are always blocked.</span>
                    </div>
                    <label className="flex items-center gap-2 text-white/60">
                      <input
                        type="checkbox"
                        checked={draft.ingestAllPublicChannels}
                        onChange={(event) => setDraft({ ...draft, ingestAllPublicChannels: event.target.checked })}
                      />
                      Ingest all public channels when no allowlist is set
                    </label>
                  </>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <span className="text-white/50">
                      <HelpLabel
                        title="Default sensitivity"
                        help="This label is applied to new evidence from the connector unless a more specific rule overrides it."
                      >
                        Default sensitivity
                      </HelpLabel>
                    </span>
                    <select
                      aria-label="Default sensitivity"
                      className="input"
                      value={draft.defaultSensitivity}
                      onChange={(event) => setDraft({ ...draft, defaultSensitivity: event.target.value as ConnectorPolicyDraft["defaultSensitivity"] })}
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal</option>
                      <option value="confidential">Confidential</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-white/50">
                      <HelpLabel
                        title="Max sensitivity"
                        help="This caps the sensitivity level this connector is allowed to ingest. Use a lower cap for channels or systems that should never bring restricted material into Nexus."
                      >
                        Max sensitivity
                      </HelpLabel>
                    </span>
                    <select
                      aria-label="Max sensitivity"
                      className="input"
                      value={draft.maxSensitivity}
                      onChange={(event) => setDraft({ ...draft, maxSensitivity: event.target.value as ConnectorPolicyDraft["maxSensitivity"] })}
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal</option>
                      <option value="confidential">Confidential</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-white/50">
                      <HelpLabel
                        title="Source policy"
                        help="Source policy controls how Nexus treats incoming data from this connector: ingest automatically, prefer manual review, or disable the source."
                      >
                        Source policy
                      </HelpLabel>
                    </span>
                    <select
                      aria-label="Source policy"
                      className="input"
                      value={draft.sourcePolicy}
                      onChange={(event) => setDraft({ ...draft, sourcePolicy: event.target.value as ConnectorPolicyDraft["sourcePolicy"] })}
                    >
                      <option value="read_only">Read-only ingest</option>
                      <option value="manual_review">Manual review preferred</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                <label className="space-y-1">
                  <span className="text-white/50">Admin notes</span>
                  <textarea
                    className="input min-h-20"
                    value={draft.notes}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    placeholder="Example: only ingest #exec-weekly and #ops-review during pilot."
                  />
                </label>
                <button
                  className="btn-primary w-fit text-xs"
                  disabled={saving === def.type}
                  onClick={() => onSavePolicy(def.type, draft)}
                >
                  {saving === def.type ? "Saving..." : "Save policy"}
                </button>
              </div>
            )}
          </>
        )}

        {record?.syncError && (
          <p className="mt-1 text-xs text-red-300">{record.syncError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {!isInstalled && def.available && def.connectKind === "manual" && (
          <button
            className="btn-primary text-xs"
            onClick={() => setImapFormOpen((value) => !value)}
          >
            {imapFormOpen ? "Cancel" : "Connect →"}
          </button>
        )}
        {!isInstalled && def.available && def.connectKind !== "manual" && (
          <a href={def.installHref} className="btn-primary text-xs">
            Install →
          </a>
        )}
        {def.setupHref && (
          <a
            href={def.setupHref}
            {...externalAttrs}
            className="btn-subtle text-xs"
          >
            {def.available ? "Provider setup" : def.type === "private" ? "Scope connector" : "Setup guide"}
          </a>
        )}
        {def.docsHref && def.docsHref !== def.setupHref && (
          <a href={def.docsHref} {...externalAttrs} className="text-xs text-white/35 transition hover:text-white/65">
            Docs
          </a>
        )}
        {isActive && (
          <button
            onClick={() => onRevoke(def.type)}
            disabled={revoking === def.type}
            className="btn-subtle text-xs text-red-300 border-red-400/20 hover:bg-red-400/10"
          >
            {revoking === def.type ? "Revoking..." : "Revoke"}
          </button>
        )}
        {isRevoked && def.available && def.connectKind === "manual" && (
          <button
            className="btn-subtle text-xs"
            onClick={() => setImapFormOpen((value) => !value)}
          >
            {imapFormOpen ? "Cancel" : "Reconnect"}
          </button>
        )}
        {isRevoked && def.available && def.connectKind !== "manual" && (
          <a href={def.installHref} className="btn-subtle text-xs">
            Reinstall
          </a>
        )}
      </div>

      {/* Inline IMAP connect form — manual server settings, no OAuth */}
      {def.connectKind === "manual" && imapFormOpen && !isInstalled && (
        <div className="mt-3 w-full basis-full grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-white/50">
                <HelpLabel
                  title="IMAP host"
                  help="The IMAP host is the mail server address provided by your email host, such as imap.example.com. Nexus uses it to read mailbox messages after you connect."
                >
                  IMAP host
                </HelpLabel>
              </span>
              <input
                aria-label="IMAP host"
                className="input"
                value={imapDraft.host}
                onChange={(e) => setImapDraft({ ...imapDraft, host: e.target.value })}
                placeholder="imap.example.com"
              />
            </div>
            <label className="space-y-1">
              <span className="text-white/50">Port</span>
              <input
                className="input"
                value={imapDraft.port}
                onChange={(e) => setImapDraft({ ...imapDraft, port: e.target.value })}
                placeholder="993"
              />
            </label>
            <label className="space-y-1">
              <span className="text-white/50">Username</span>
              <input
                className="input"
                value={imapDraft.username}
                onChange={(e) => setImapDraft({ ...imapDraft, username: e.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label className="space-y-1">
              <span className="text-white/50">Password</span>
              <input
                type="password"
                className="input"
                value={imapDraft.password}
                onChange={(e) => setImapDraft({ ...imapDraft, password: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-white/50">Label (optional)</span>
              <input
                className="input"
                value={imapDraft.label}
                onChange={(e) => setImapDraft({ ...imapDraft, label: e.target.value })}
                placeholder="Support inbox"
              />
            </label>
            <label className="flex items-center gap-2 text-white/60 self-end">
              <input
                type="checkbox"
                checked={imapDraft.secure}
                onChange={(e) => setImapDraft({ ...imapDraft, secure: e.target.checked })}
              />
              Use TLS (recommended, port 993)
            </label>
          </div>
          <button
            className="btn-primary w-fit text-xs"
            disabled={connectingImap}
            onClick={() => onConnectImap(imapDraft)}
          >
            {connectingImap ? "Connecting..." : "Connect mailbox"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lane section
// ---------------------------------------------------------------------------

const LANE_LABELS: Record<ConnectorDef["lane"], string> = {
  saas: "SaaS Connectors",
  warehouse: "Data Warehouse Connectors",
  private: "Private / On-Premises",
};

function ConnectorSetupGuide() {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white/80">
            <HelpLabel
              title="Connector setup guide"
              help="This is the complete connector list for this workspace. Use it to see which connectors are live, which are future, what credentials are required, and which provider setup page to open before clicking Install."
            >
              Connector setup guide
            </HelpLabel>
          </p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-white/45">
            OAuth connectors need provider credentials and an exact redirect URI before the in-app Install button will work.
            Manual connectors collect settings in Nexus. Future connectors show planning links instead of fake install actions.
          </p>
        </div>
        <span className="text-xs text-white/35">
          docs/CONNECTOR_SETUP_GUIDE.md
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {CONNECTOR_CATALOGUE.map((connector) => {
          const redirectUri = connector.redirectPath
            ? `{NEXT_PUBLIC_APP_URL}${connector.redirectPath}`
            : connector.connectKind === "manual"
              ? "No redirect URI"
              : "Not defined yet";
          return (
            <article key={connector.type} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{connector.name}</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{connector.dataScope}</p>
                </div>
                <span className={`badge ${connector.available ? "badge-green" : "badge-muted"}`}>
                  {connector.available ? connector.connectKind === "manual" ? "Manual live" : "OAuth live" : "Future"}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-white/30">Environment</dt>
                  <dd className="mt-0.5 font-mono text-white/55">
                    {connector.envVars?.length ? connector.envVars.join(", ") : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/30">Redirect URI</dt>
                  <dd className="mt-0.5 break-all font-mono text-white/55">{redirectUri}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-white/30">Scopes / access</dt>
                  <dd className="mt-0.5 text-white/55">{connector.scopes?.join(", ") || "To be defined"}</dd>
                </div>
              </dl>

              <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-5 text-white/50">
                {connector.setupNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ol>

              <div className="mt-3 flex flex-wrap gap-2">
                {connector.setupHref && (
                  <a
                    href={connector.setupHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-subtle text-xs"
                  >
                    {connector.type === "private" ? "Scope connector" : "Open provider setup"}
                  </a>
                )}
                {connector.docsHref && (
                  <a href={connector.docsHref} target="_blank" rel="noreferrer" className="btn-subtle text-xs">
                    Official docs
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ConnectorsPage() {
  const searchParams = useSearchParams();
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState<string | null>(null);
  const [connectingImap, setConnectingImap] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Handle redirect params from OAuth callback
  useEffect(() => {
    const installed = searchParams.get("installed");
    const error = searchParams.get("error");
    if (installed) {
      setToast({ type: "success", message: `${installed} connected successfully.` });
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: "You declined the install request.",
        invalid_state: "OAuth state mismatch — please try again.",
        token_exchange_failed: "Token exchange failed. Check your app credentials.",
        connector_store_failed: "Connector installed but failed to save credentials. Contact support.",
        slack_not_configured: "Slack OAuth is not configured on this instance.",
        google_not_configured: "Google OAuth is not configured on this instance.",
        google_client_id_not_configured: "Google OAuth is not configured on this instance.",
        microsoft_not_configured: "Microsoft OAuth is not configured on this instance.",
        microsoft_client_id_not_configured: "Microsoft OAuth is not configured on this instance.",
        github_not_configured: "GitHub OAuth is not configured on this instance.",
        github_client_id_not_configured: "GitHub OAuth is not configured on this instance.",
        jira_not_configured: "Jira OAuth is not configured on this instance.",
        jira_client_id_not_configured: "Jira OAuth is not configured on this instance.",
        jira_site_resolution_failed: "Could not resolve a Jira Cloud site for this account.",
        jira_no_accessible_site: "This Atlassian account has no accessible Jira Cloud site.",
        hubspot_not_configured: "HubSpot OAuth is not configured on this instance.",
        hubspot_client_id_not_configured: "HubSpot OAuth is not configured on this instance.",
        quickbooks_not_configured: "QuickBooks OAuth is not configured on this instance.",
        quickbooks_client_id_not_configured: "QuickBooks OAuth is not configured on this instance.",
        linkedin_not_configured: "LinkedIn OAuth is not configured on this instance.",
        linkedin_client_id_not_configured: "LinkedIn OAuth is not configured on this instance.",
        google_client_id_not_configured_gmail: "Google OAuth is not configured on this instance.",
        microsoft_client_id_not_configured_outlook: "Microsoft OAuth is not configured on this instance.",
      };
      setToast({ type: "error", message: messages[error] ?? `Install failed: ${error}` });
    }
  }, [searchParams]);

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connectors");
      const payload = await res.json();
      if (payload.ok) setConnectors(payload.data.connectors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  async function handleRevoke(type: string) {
    setRevoking(type);
    try {
      const res = await fetch(`/api/connectors/${type}`, { method: "DELETE" });
      const payload = await res.json();
      if (payload.ok) {
        setToast({ type: "success", message: `${type} connector revoked.` });
        await fetchConnectors();
      } else {
        setToast({ type: "error", message: payload.error ?? "Revoke failed." });
      }
    } finally {
      setRevoking(null);
    }
  }

  async function handleConnectImap(draft: {
    host: string;
    port: string;
    secure: boolean;
    username: string;
    password: string;
    label: string;
  }) {
    setConnectingImap(true);
    try {
      const res = await fetch("/api/connectors/imap/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          host: draft.host,
          port: Number(draft.port) || 993,
          secure: draft.secure,
          username: draft.username,
          password: draft.password,
          label: draft.label || undefined,
        }),
      });
      const payload = await res.json();
      if (payload.ok) {
        setToast({ type: "success", message: "IMAP mailbox connected successfully." });
        await fetchConnectors();
      } else {
        setToast({ type: "error", message: payload.error ?? "IMAP connection failed." });
      }
    } finally {
      setConnectingImap(false);
    }
  }

  async function handleSavePolicy(type: string, draft: ConnectorPolicyDraft) {
    setSavingPolicy(type);
    try {
      const allowedChannels = draft.allowedChannels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch(`/api/connectors/${type}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          allowedChannels,
          ingestAllPublicChannels: draft.ingestAllPublicChannels,
          defaultSensitivity: draft.defaultSensitivity,
          maxSensitivity: draft.maxSensitivity,
          sourcePolicy: draft.sourcePolicy,
          notes: draft.notes,
        }),
      });
      const payload = await res.json();
      if (payload.ok) {
        setToast({ type: "success", message: `${type} policy saved.` });
        await fetchConnectors();
      } else {
        setToast({ type: "error", message: payload.error ?? "Policy save failed." });
      }
    } finally {
      setSavingPolicy(null);
    }
  }

  // Build record lookup by type
  const recordByType = Object.fromEntries(connectors.map((c) => [c.type, c]));

  // Group catalogue by lane
  const lanes: ConnectorDef["lane"][] = ["saas", "warehouse", "private"];

  return (
    <PageShell title="Connectors" description="Manage data source integrations for your workspace.">
      {/* Toast notification */}
      {toast && (
        <div
          className={[
            "mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
            toast.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-red-400/40 bg-red-400/10 text-red-200",
          ].join(" ")}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <ConnectorSetupGuide />

      {loading ? (
        <div className="py-12 text-center text-sm text-white/40">Loading connectors...</div>
      ) : (
        <div className="space-y-8">
          {lanes.map((lane) => {
            const defs = CONNECTOR_CATALOGUE.filter((c) => c.lane === lane);
            return (
              <section key={lane}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {LANE_LABELS[lane]}
                </p>
                <div className="space-y-3">
                  {defs.map((def) => (
                    <ConnectorRow
                      key={def.type}
                      def={def}
                      record={recordByType[def.type]}
                      onRevoke={handleRevoke}
                      onSavePolicy={handleSavePolicy}
                      onConnectImap={handleConnectImap}
                      revoking={revoking}
                      saving={savingPolicy}
                      connectingImap={connectingImap}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/45">
        Connector credentials are stored separately from source policy. After any connector is installed, open
        <span className="text-white/65"> Configure source policy </span>
        before ingesting production data so sensitivity limits, review preference, and allowed source boundaries are explicit.
      </div>
    </PageShell>
  );
}
