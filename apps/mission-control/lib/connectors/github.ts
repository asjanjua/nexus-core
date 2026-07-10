/**
 * GitHub OAuth 2.0 connector client.
 *
 * Pure fetch — no Octokit / GitHub SDK dependency. Follows the same
 * zero-SDK pattern used by the Google Drive and SharePoint connectors.
 *
 * OAuth 2.0 flow (GitHub "web application flow"):
 *   1. getAuthUrl()      → redirect user to GitHub consent screen
 *   2. GitHub redirects  → /api/connectors/github/callback?code=...&state=...
 *   3. exchangeCode()    → POST to token endpoint for access token
 *   4. GitHub OAuth app tokens do not expire by default, so there is no
 *      refresh flow for classic OAuth apps. refreshAccessToken() is kept
 *      as a no-op-safe stub for symmetry with the other connectors and to
 *      support GitHub Apps (which do issue refresh tokens) if migrated later.
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 */

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

// Read-only repo + org visibility. GitHub OAuth apps do not offer a
// narrower "repo:read" scope — "repo" is the least-privileged scope that
// reliably covers private repo issue/PR reads. We never write.
const GITHUB_SCOPE = "repo read:org read:user";

function getClientId(): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!secret) throw new Error("GITHUB_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connectors/github/callback`;
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface GitHubAuthUrlParams {
  state: string;
}

/**
 * Generate the GitHub OAuth 2.0 consent URL.
 *
 * @param state - Opaque state token (workspaceId + timestamp, signed)
 * @returns Full authorization URL to redirect the browser to
 */
export function getAuthUrl(params: GitHubAuthUrlParams): string {
  const url = new URL(GITHUB_AUTH_URL);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("scope", GITHUB_SCOPE);
  url.searchParams.set("state", params.state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface GitHubTokens {
  access_token: string;
  scope: string;
  token_type: string;
  // GitHub Apps (not classic OAuth apps) may include these; classic OAuth
  // apps omit them, in which case the token does not expire.
  expires_in?: number;
  refresh_token?: string;
}

export interface GitHubTokenError {
  error: string;
  error_description?: string;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeCode(code: string): Promise<GitHubTokens> {
  const body = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    const err = json as GitHubTokenError;
    throw new Error(
      `GitHub token exchange failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as GitHubTokens;
}

/**
 * Refresh an access token. Classic GitHub OAuth app tokens do not expire
 * and have no refresh token, so this throws unless a refresh_token is
 * actually present (GitHub App installations only).
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GitHubTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "refresh_token",
  });

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    const err = json as GitHubTokenError;
    throw new Error(
      `GitHub token refresh failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as GitHubTokens;
}

// ---------------------------------------------------------------------------
// GitHub API — repos & issues
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  description?: string | null;
  updated_at: string;
  html_url: string;
}

/**
 * List repositories visible to the authenticated user.
 * Returns up to 50 repos sorted by most recently pushed.
 */
export async function listRepos(
  accessToken: string,
  page = 1
): Promise<GitHubRepo[]> {
  const url = new URL(`${GITHUB_API}/user/repos`);
  url.searchParams.set("per_page", "50");
  url.searchParams.set("sort", "pushed");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub repo list failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GitHubRepo[]>;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string } | null;
  labels: Array<{ name: string } | string>;
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_request?: unknown;
}

/**
 * List issues (and PRs, which GitHub also returns from this endpoint)
 * for a given repo.
 *
 * @param accessToken - Valid GitHub OAuth access token
 * @param owner       - Repo owner login
 * @param repo        - Repo name
 * @param page        - Pagination page (30 per page)
 */
export async function listIssues(
  accessToken: string,
  owner: string,
  repo: string,
  page = 1
): Promise<GitHubIssue[]> {
  const url = new URL(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`
  );
  url.searchParams.set("state", "all");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub issue list failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GitHubIssue[]>;
}

/**
 * Fetch a single issue (or PR) by number for serialization into evidence.
 */
export async function getIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub issue fetch failed (${res.status} for ${owner}/${repo}#${issueNumber}): ${body}`
    );
  }

  return res.json() as Promise<GitHubIssue>;
}
