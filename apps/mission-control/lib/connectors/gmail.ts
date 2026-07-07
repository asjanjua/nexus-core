/**
 * Gmail connector — pure fetch, no SDK dependency.
 *
 * Mirrors lib/connectors/google-drive.ts structurally (same Google OAuth
 * client, different scope and API surface). Implements the Google OAuth
 * 2.0 authorization-code flow and the subset of the Gmail REST API needed
 * to list and read messages in the signed-in user's mailbox.
 *
 * Environment variables required:
 *   GOOGLE_CLIENT_ID      — Google Cloud OAuth client ID (shared with google-drive.ts)
 *   GOOGLE_CLIENT_SECRET  — Google Cloud OAuth client secret
 *   NEXT_PUBLIC_APP_URL   — used to build the OAuth redirect URI
 *
 * Note: Gmail and Google Drive use the same Google Cloud OAuth client but
 * request different scopes, so each connector has its own redirect URI
 * and therefore its own install/callback routes and its own token record
 * (stored under connector type "gmail").
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

/** read-only scope — Nexus never sends or deletes mail. */
const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

function getClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return clientSecret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return `${appUrl}/api/connectors/gmail/callback`;
}

export function gmailOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

// ---------------------------------------------------------------------------
// OAuth — authorization code flow
// ---------------------------------------------------------------------------

export interface GoogleAuthUrlParams {
  state: string;
}

export function getAuthUrl(params: GoogleAuthUrlParams): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

export interface GoogleTokenError {
  error: string;
  error_description?: string;
}

async function postToken(body: Record<string, string>): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const json = (await res.json()) as GoogleTokens & GoogleTokenError;
  if (!res.ok || !json.access_token) {
    const message = json.error_description ?? json.error ?? `token request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  return postToken({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
    code,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  return postToken({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

// ---------------------------------------------------------------------------
// Gmail REST API — message listing and reading
// ---------------------------------------------------------------------------

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
}

export interface GmailMessageList {
  messages: GmailMessageSummary[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

async function gmailGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gmail_error_${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Lists message IDs in the signed-in user's mailbox.
 *
 * @param q optional Gmail search query (e.g. "in:inbox newer_than:30d")
 * @param pageToken pagination token from a previous call
 */
export async function listMessages(
  accessToken: string,
  q?: string,
  pageToken?: string
): Promise<GmailMessageList> {
  const url = new URL(`${GMAIL_API}/users/me/messages`);
  url.searchParams.set("maxResults", "50");
  if (q) url.searchParams.set("q", q);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const data = await gmailGet<GmailListResponse>(url.toString(), accessToken);

  return {
    messages: (data.messages ?? []).map((m) => ({ id: m.id, threadId: m.threadId })),
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate,
  };
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessageFull {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

/** Fetches a single message in full format (headers + body parts). */
export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageFull> {
  const url = `${GMAIL_API}/users/me/messages/${encodeURIComponent(messageId)}?format=full`;
  return gmailGet<GmailMessageFull>(url, accessToken);
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}

/**
 * Walks a Gmail message's MIME tree and extracts the best available
 * plain-text body. Falls back to a stripped version of HTML if no
 * text/plain part exists.
 */
export function extractPlainTextBody(payload?: GmailMessagePart): string {
  if (!payload) return "";

  let textPlain: string | undefined;
  let textHtml: string | undefined;

  function walk(part: GmailMessagePart) {
    if (part.mimeType === "text/plain" && part.body?.data && !textPlain) {
      textPlain = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data && !textHtml) {
      textHtml = decodeBase64Url(part.body.data);
    }
    for (const child of part.parts ?? []) {
      walk(child);
    }
  }

  walk(payload);

  if (textPlain) return textPlain;
  if (textHtml) return textHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

export function getHeader(payload: GmailMessagePart | undefined, name: string): string | undefined {
  return payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}
