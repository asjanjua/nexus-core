/**
 * Google Drive OAuth 2.0 connector client.
 *
 * Pure fetch — no Google SDK dependency. Follows the same zero-SDK pattern
 * used by the Stripe and Resend integrations.
 *
 * OAuth 2.0 flow:
 *   1. getAuthUrl()      → redirect user to Google consent screen
 *   2. Google redirects  → /api/connectors/google-drive/callback?code=...
 *   3. exchangeCode()    → POST to token endpoint for access + refresh tokens
 *   4. refreshAccessToken() → use refresh token when access token expires
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function getClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
  return `${appUrl}/api/connectors/google-drive/callback`;
}

export function googleDriveOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface GoogleAuthUrlParams {
  state: string;
}

/**
 * Generate the Google OAuth 2.0 consent URL.
 *
 * Scopes requested:
 *   - drive.readonly  — list and download files, never modify
 *
 * @param state - Opaque state token (workspaceId + timestamp, signed)
 * @returns Full authorization URL to redirect the browser to
 */
export function getAuthUrl(params: GoogleAuthUrlParams): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface GoogleTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface GoogleTokenError {
  error: string;
  error_description?: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as GoogleTokenError;
    throw new Error(
      `Google token exchange failed: ${err.error}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as GoogleTokens;
}

/**
 * Refresh an expired access token using a refresh token.
 * Google may return a new refresh token; always use the latest.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as GoogleTokenError;
    throw new Error(
      `Google token refresh failed: ${err.error}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as GoogleTokens;
}

// ---------------------------------------------------------------------------
// Drive API — files
// ---------------------------------------------------------------------------

export interface GoogleDriveFile {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface GoogleDriveFileList {
  kind: string;
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

/**
 * List files in the user's Drive (not shared drives).
 * Returns up to 50 files sorted by recency.
 *
 * @param accessToken - Valid Google OAuth access token
 * @param pageToken  - Pagination token for next page
 */
export async function listFiles(
  accessToken: string,
  pageToken?: string
): Promise<GoogleDriveFileList> {
  const url = new URL(`${GOOGLE_DRIVE_API}/files`);
  url.searchParams.set("pageSize", "50");
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,parents),nextPageToken"
  );
  url.searchParams.set("orderBy", "modifiedTime desc");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive list failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GoogleDriveFileList>;
}

/**
 * Download the raw content of a file from Drive.
 *
 * @param accessToken - Valid Google OAuth access token
 * @param fileId     - Google Drive file ID
 * @returns Response object with the file body as a readable stream
 */
export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<{ contentType: string; body: ReadableStream<Uint8Array> | null }> {
  const url = `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Google Drive download failed (${res.status} for file ${fileId}): ${body}`
    );
  }

  return {
    contentType:
      res.headers.get("content-type") ?? "application/octet-stream",
    body: res.body,
  };
}
