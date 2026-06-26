/**
 * Outlook Mail connector — pure fetch, no SDK dependency.
 *
 * Mirrors lib/connectors/sharepoint.ts structurally (same Microsoft
 * identity platform OAuth client, different scope and Graph surface).
 * Implements the Microsoft OAuth 2.0 authorization-code flow and the
 * subset of Microsoft Graph needed to list and read messages in the
 * signed-in user's mailbox (works for Outlook.com and Microsoft 365 /
 * Exchange Online mailboxes alike, since both sit behind Graph).
 *
 * Environment variables required:
 *   MICROSOFT_CLIENT_ID      — Azure AD app registration client ID (shared with sharepoint.ts)
 *   MICROSOFT_CLIENT_SECRET  — Azure AD app registration client secret
 *   MICROSOFT_TENANT_ID      — Azure AD tenant ID, or "common" for multi-tenant
 *   NEXT_PUBLIC_APP_URL      — used to build the OAuth redirect URI
 *
 * Note: Outlook Mail and SharePoint use the same Azure AD app registration
 * but request different scopes, so each connector has its own redirect
 * URI and its own token record (stored under connector type "outlook-mail").
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GRAPH_API = "https://graph.microsoft.com/v1.0";

/** Scopes requested during install. offline_access is required for refresh tokens. */
const GRAPH_SCOPE = "offline_access User.Read Mail.Read";

function getTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID?.trim() || "common";
}

function getAuthorizeUrl(): string {
  return `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/authorize`;
}

function getTokenUrl(): string {
  return `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/token`;
}

function getClientId(): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID is not set");
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (!clientSecret) throw new Error("MICROSOFT_CLIENT_SECRET is not set");
  return clientSecret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return `${appUrl}/api/connectors/outlook-mail/callback`;
}

// ---------------------------------------------------------------------------
// OAuth — authorization code flow
// ---------------------------------------------------------------------------

export interface MicrosoftAuthUrlParams {
  state: string;
}

export function getAuthUrl(params: MicrosoftAuthUrlParams): string {
  const url = new URL(getAuthorizeUrl());
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", GRAPH_SCOPE);
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export interface MicrosoftTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

export interface MicrosoftTokenError {
  error: string;
  error_description?: string;
}

async function postToken(body: Record<string, string>): Promise<MicrosoftTokens> {
  const res = await fetch(getTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const json = (await res.json()) as MicrosoftTokens & MicrosoftTokenError;
  if (!res.ok || !json.access_token) {
    const message = json.error_description ?? json.error ?? `token request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function exchangeCode(code: string): Promise<MicrosoftTokens> {
  return postToken({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
    code,
    scope: GRAPH_SCOPE,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  return postToken({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: GRAPH_SCOPE,
  });
}

// ---------------------------------------------------------------------------
// Microsoft Graph — message listing and reading
// ---------------------------------------------------------------------------

export interface OutlookMessageSummary {
  id: string;
  subject?: string;
  from?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
}

export interface OutlookMessageList {
  messages: OutlookMessageSummary[];
  nextPageToken?: string;
}

interface GraphMessageListItem {
  id: string;
  subject?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
}

interface GraphMessageListResponse {
  value: GraphMessageListItem[];
  "@odata.nextLink"?: string;
}

async function graphGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`graph_error_${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Lists messages in the signed-in user's mailbox, newest first.
 * Pass nextPageToken (the full @odata.nextLink URL) to page forward.
 */
export async function listMessages(
  accessToken: string,
  nextPageToken?: string
): Promise<OutlookMessageList> {
  const url =
    nextPageToken ??
    `${GRAPH_API}/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview`;

  const data = await graphGet<GraphMessageListResponse>(url, accessToken);

  const messages: OutlookMessageSummary[] = data.value.map((item) => ({
    id: item.id,
    subject: item.subject,
    from: item.from?.emailAddress?.address,
    receivedDateTime: item.receivedDateTime,
    bodyPreview: item.bodyPreview,
  }));

  return {
    messages,
    nextPageToken: data["@odata.nextLink"],
  };
}

export interface OutlookMessageFull {
  id: string;
  subject?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string; name?: string } }[];
  receivedDateTime?: string;
  body?: { contentType?: string; content?: string };
  webLink?: string;
}

/** Fetches a single message with full body content. */
export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<OutlookMessageFull> {
  const url = `${GRAPH_API}/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,toRecipients,receivedDateTime,body,webLink`;
  return graphGet<OutlookMessageFull>(url, accessToken);
}

/**
 * Extracts plain text from a Graph message body, stripping HTML tags
 * if the body content type is HTML (Graph defaults to HTML bodies).
 */
export function extractPlainTextBody(body?: OutlookMessageFull["body"]): string {
  if (!body?.content) return "";
  if (body.contentType === "text") return body.content;
  return body.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
