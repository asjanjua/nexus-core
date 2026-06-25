/**
 * Atlassian (Jira) OAuth 2.0 (3LO) connector client.
 *
 * Pure fetch — no Atlassian SDK dependency. Follows the same zero-SDK
 * pattern used by the Google Drive and SharePoint connectors.
 *
 * OAuth 2.0 (3LO) flow:
 *   1. getAuthUrl()              → redirect user to Atlassian consent screen
 *   2. Atlassian redirects       → /api/connectors/jira/callback?code=...&state=...
 *   3. exchangeCode()            → POST to token endpoint for access + refresh tokens
 *   4. getAccessibleResources()  → resolve the Jira Cloud site (cloudId) granted
 *   5. refreshAccessToken()      → use refresh token when access token expires
 *
 * Jira Cloud is multi-tenant by "site" (cloudId), so every API call must be
 * scoped through https://api.atlassian.com/ex/jira/{cloudId}/...
 *
 * Required env vars:
 *   JIRA_CLIENT_ID
 *   JIRA_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 */

const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_ACCESSIBLE_RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";
const ATLASSIAN_API_BASE = "https://api.atlassian.com/ex/jira";

const JIRA_SCOPE = "read:jira-work read:jira-user offline_access";

function getClientId(): string {
  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) throw new Error("JIRA_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.JIRA_CLIENT_SECRET;
  if (!secret) throw new Error("JIRA_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connectors/jira/callback`;
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface JiraAuthUrlParams {
  state: string;
}

/**
 * Generate the Atlassian OAuth 2.0 (3LO) consent URL.
 */
export function getAuthUrl(params: JiraAuthUrlParams): string {
  const url = new URL(ATLASSIAN_AUTH_URL);
  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("scope", JIRA_SCOPE);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface JiraTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface JiraTokenError {
  error: string;
  error_description?: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<JiraTokens> {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as JiraTokenError;
    throw new Error(
      `Jira token exchange failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as JiraTokens;
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<JiraTokens> {
  const res = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as JiraTokenError;
    throw new Error(
      `Jira token refresh failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as JiraTokens;
}

// ---------------------------------------------------------------------------
// Accessible resources (cloudId resolution)
// ---------------------------------------------------------------------------

export interface JiraAccessibleResource {
  id: string; // this is the cloudId
  name: string;
  url: string;
  scopes: string[];
}

/**
 * Resolve which Jira Cloud site(s) this access token can reach.
 * Most installs will have exactly one site; we use the first by default.
 */
export async function getAccessibleResources(
  accessToken: string
): Promise<JiraAccessibleResource[]> {
  const res = await fetch(ATLASSIAN_ACCESSIBLE_RESOURCES_URL, {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira accessible-resources failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<JiraAccessibleResource[]>;
}

// ---------------------------------------------------------------------------
// Jira API — issues
// ---------------------------------------------------------------------------

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status?: { name: string };
    issuetype?: { name: string };
    project?: { key: string; name: string };
    assignee?: { displayName: string } | null;
    reporter?: { displayName: string } | null;
    created: string;
    updated: string;
    labels?: string[];
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

/**
 * Search issues across a Jira Cloud site using JQL.
 *
 * @param accessToken - Valid Jira OAuth access token
 * @param cloudId     - The Jira Cloud site id from getAccessibleResources()
 * @param jql         - JQL query string (defaults to all issues, newest first)
 * @param startAt     - Pagination offset
 */
export async function searchIssues(
  accessToken: string,
  cloudId: string,
  jql = "ORDER BY updated DESC",
  startAt = 0
): Promise<JiraSearchResult> {
  const url = new URL(`${ATLASSIAN_API_BASE}/${cloudId}/rest/api/3/search`);
  url.searchParams.set("jql", jql);
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira issue search failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<JiraSearchResult>;
}

/**
 * Fetch a single issue by key (e.g. "PROJ-123") for evidence ingestion.
 */
export async function getIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string
): Promise<JiraIssue> {
  const url = `${ATLASSIAN_API_BASE}/${cloudId}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira issue fetch failed (${res.status} for ${issueKey}): ${body}`);
  }

  return res.json() as Promise<JiraIssue>;
}

/**
 * Best-effort plain-text extraction from Jira's Atlassian Document Format
 * (ADF) description field, which is a nested JSON tree rather than a string.
 */
export function extractAdfText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as { type?: string; text?: string; content?: unknown[] };
  if (obj.type === "text" && typeof obj.text === "string") return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractAdfText).join(" ");
  }
  return "";
}
