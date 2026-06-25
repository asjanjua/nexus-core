/**
 * Microsoft SharePoint / Teams connector — pure fetch, no SDK dependency.
 *
 * Mirrors lib/connectors/google-drive.ts structurally. Implements the
 * Microsoft identity platform OAuth 2.0 authorization-code flow and the
 * subset of Microsoft Graph needed to list and download files from a
 * user's OneDrive / SharePoint document libraries (which is how Teams
 * file tabs and SharePoint sites both expose their content).
 *
 * Environment variables required:
 *   MICROSOFT_CLIENT_ID      — Azure AD app registration client ID
 *   MICROSOFT_CLIENT_SECRET  — Azure AD app registration client secret
 *   MICROSOFT_TENANT_ID      — Azure AD tenant ID, or "common" for multi-tenant
 *   NEXT_PUBLIC_APP_URL      — used to build the OAuth redirect URI
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GRAPH_API = "https://graph.microsoft.com/v1.0";

/** Scopes requested during install. offline_access is required for refresh tokens. */
const GRAPH_SCOPE = "offline_access User.Read Files.Read.All Sites.Read.All";

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
  return `${appUrl}/api/connectors/sharepoint/callback`;
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
// Microsoft Graph — file listing and download
// ---------------------------------------------------------------------------

export interface SharePointFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webUrl?: string;
  lastModifiedDateTime?: string;
  isFolder: boolean;
}

export interface SharePointFileList {
  files: SharePointFile[];
  nextPageToken?: string;
}

interface GraphDriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string };
  folder?: Record<string, unknown>;
}

interface GraphDriveItemList {
  value: GraphDriveItem[];
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
 * Lists files at the root of the signed-in user's default OneDrive/SharePoint
 * document library. Pass nextPageToken (the full @odata.nextLink URL) to
 * page forward.
 */
export async function listFiles(
  accessToken: string,
  nextPageToken?: string
): Promise<SharePointFileList> {
  const url =
    nextPageToken ?? `${GRAPH_API}/me/drive/root/children?$top=50&$select=id,name,size,webUrl,lastModifiedDateTime,file,folder`;

  const data = await graphGet<GraphDriveItemList>(url, accessToken);

  const files: SharePointFile[] = data.value.map((item) => ({
    id: item.id,
    name: item.name,
    mimeType: item.file?.mimeType ?? (item.folder ? "application/vnd.folder" : "application/octet-stream"),
    size: item.size,
    webUrl: item.webUrl,
    lastModifiedDateTime: item.lastModifiedDateTime,
    isFolder: Boolean(item.folder),
  }));

  return {
    files,
    nextPageToken: data["@odata.nextLink"],
  };
}

/**
 * Downloads a file's raw content by drive item ID via Graph's
 * /content endpoint, which redirects to a short-lived download URL.
 */
export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<{ contentType: string; body: ReadableStream<Uint8Array> | null }> {
  const res = await fetch(`${GRAPH_API}/me/drive/items/${encodeURIComponent(fileId)}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`graph_download_error_${res.status}: ${text.slice(0, 300)}`);
  }

  return {
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    body: res.body,
  };
}
