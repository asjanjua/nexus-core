/**
 * LinkedIn OAuth 2.0 connector client.
 *
 * Pure fetch — no LinkedIn SDK dependency. Follows the same zero-SDK
 * pattern used by the Google Drive and SharePoint connectors.
 *
 * OAuth 2.0 flow:
 *   1. getAuthUrl()       → redirect user to LinkedIn consent screen
 *   2. LinkedIn redirects → /api/connectors/linkedin/callback?code=...&state=...
 *   3. exchangeCode()     → POST to token endpoint for access token
 *   4. refreshAccessToken() → use refresh token when access token expires
 *      (only available if the app has the "Sign In with LinkedIn using
 *      OpenID Connect" + refresh token product enabled)
 *
 * IMPORTANT: LinkedIn's organization/company-page APIs (posts, follower
 * stats, social actions) require the "Community Management API" or
 * "Marketing Developer Platform" product, which is gated behind a
 * partner application review. Until that review is approved for a given
 * LinkedIn app, organizationalEntityShareStatistics / posts endpoints
 * will 403. This client is built against the documented REST shape so it
 * is ready to go the moment the app is approved — see CUTOVER.md for the
 * application steps.
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 */

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API = "https://api.linkedin.com/rest";
const LINKEDIN_API_VERSION = "202401"; // LinkedIn REST API version header

// r_organization_social: read company page posts and social metadata.
// rw_organization_admin: list the orgs the user administers.
const LINKEDIN_SCOPE = "r_organization_social rw_organization_admin";

function getClientId(): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!secret) throw new Error("LINKEDIN_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connectors/linkedin/callback`;
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface LinkedInAuthUrlParams {
  state: string;
}

export function getAuthUrl(params: LinkedInAuthUrlParams): string {
  const url = new URL(LINKEDIN_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", LINKEDIN_SCOPE);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface LinkedInTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInTokenError {
  error: string;
  error_description?: string;
}

export async function exchangeCode(code: string): Promise<LinkedInTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as LinkedInTokenError;
    throw new Error(
      `LinkedIn token exchange failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as LinkedInTokens;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<LinkedInTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as LinkedInTokenError;
    throw new Error(
      `LinkedIn token refresh failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as LinkedInTokens;
}

// ---------------------------------------------------------------------------
// Organization API — posts
// ---------------------------------------------------------------------------

export interface LinkedInOrgAcl {
  organizationalTarget: string; // urn:li:organization:{id}
  role: string;
}

/**
 * List the organizations (company pages) this account administers.
 */
export async function listAdministeredOrgs(
  accessToken: string
): Promise<LinkedInOrgAcl[]> {
  const url = new URL(`${LINKEDIN_API}/organizationAcls`);
  url.searchParams.set("q", "roleAssignee");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn org list failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { elements: LinkedInOrgAcl[] };
  return json.elements ?? [];
}

export interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  createdAt?: number;
  lastModifiedAt?: number;
  visibility?: string;
}

/**
 * List recent posts published by a given organization (company page).
 *
 * @param accessToken - Valid LinkedIn OAuth access token
 * @param orgUrn      - e.g. "urn:li:organization:12345"
 */
export async function listOrgPosts(
  accessToken: string,
  orgUrn: string
): Promise<LinkedInPost[]> {
  const url = new URL(`${LINKEDIN_API}/posts`);
  url.searchParams.set("q", "author");
  url.searchParams.set("author", orgUrn);
  url.searchParams.set("count", "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn post list failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { elements: LinkedInPost[] };
  return json.elements ?? [];
}

/**
 * Fetch a single post by its URN-derived id for evidence ingestion.
 */
export async function getPost(
  accessToken: string,
  postId: string
): Promise<LinkedInPost> {
  const url = `${LINKEDIN_API}/posts/${encodeURIComponent(postId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + accessToken,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn post fetch failed (${res.status} for ${postId}): ${body}`);
  }

  return res.json() as Promise<LinkedInPost>;
}
