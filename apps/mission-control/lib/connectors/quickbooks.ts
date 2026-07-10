/**
 * Intuit QuickBooks Online OAuth 2.0 connector client.
 *
 * Pure fetch — no Intuit SDK dependency. Follows the same zero-SDK
 * pattern used by the Google Drive and SharePoint connectors.
 *
 * OAuth 2.0 flow:
 *   1. getAuthUrl()      → redirect user to Intuit consent screen
 *   2. Intuit redirects  → /api/connectors/quickbooks/callback?code=...&state=...&realmId=...
 *      (realmId identifies the QuickBooks company file and is required
 *      on every Accounting API call)
 *   3. exchangeCode()    → POST to token endpoint for access + refresh tokens
 *   4. refreshAccessToken() → use refresh token when access token expires
 *      (Intuit refresh tokens are valid for 100 days and rotate on use)
 *
 * Required env vars:
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   QUICKBOOKS_ENVIRONMENT — "sandbox" or "production" (defaults to "production")
 */

const INTUIT_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";

function getClientId(): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  if (!clientId) throw new Error("QUICKBOOKS_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!secret) throw new Error("QUICKBOOKS_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connectors/quickbooks/callback`;
}

function getApiBase(): string {
  const env = process.env.QUICKBOOKS_ENVIRONMENT ?? "production";
  return env === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface QuickBooksAuthUrlParams {
  state: string;
}

export function getAuthUrl(params: QuickBooksAuthUrlParams): string {
  const url = new URL(INTUIT_AUTH_URL);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QUICKBOOKS_SCOPE);
  url.searchParams.set("state", params.state);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export interface QuickBooksTokenError {
  error: string;
  error_description?: string;
}

function basicAuthHeader(): string {
  return Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");
}

export async function exchangeCode(code: string): Promise<QuickBooksTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuthHeader()}`,
    },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as QuickBooksTokenError;
    throw new Error(
      `QuickBooks token exchange failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as QuickBooksTokens;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<QuickBooksTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuthHeader()}`,
    },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as QuickBooksTokenError;
    throw new Error(
      `QuickBooks token refresh failed: ${err.error ?? res.status}${
        err.error_description ? ` — ${err.error_description}` : ""
      }`
    );
  }

  return json as QuickBooksTokens;
}

// ---------------------------------------------------------------------------
// Accounting API — invoices
// ---------------------------------------------------------------------------

export interface QuickBooksInvoice {
  Id: string;
  DocNumber?: string;
  TotalAmt?: number;
  Balance?: number;
  CustomerRef?: { value: string; name?: string };
  TxnDate?: string;
  DueDate?: string;
  MetaData?: { CreateTime?: string; LastUpdatedTime?: string };
  Line?: Array<{ Description?: string; Amount?: number }>;
}

interface QuickBooksQueryResponse<T> {
  QueryResponse: {
    Invoice?: T[];
    maxResults?: number;
    startPosition?: number;
  };
}

/**
 * List invoices for a QuickBooks company file via the SQL-like query API.
 *
 * @param accessToken - Valid QuickBooks OAuth access token
 * @param realmId     - QuickBooks company file id (from the OAuth callback)
 * @param startPosition - 1-based pagination offset
 */
export async function listInvoices(
  accessToken: string,
  realmId: string,
  startPosition = 1
): Promise<QuickBooksInvoice[]> {
  const query = encodeURIComponent(
    `select * from Invoice orderby MetaData.LastUpdatedTime desc startposition ${startPosition} maxresults 50`
  );
  const url = `${getApiBase()}/v3/company/${encodeURIComponent(realmId)}/query?query=${query}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QuickBooks invoice list failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as QuickBooksQueryResponse<QuickBooksInvoice>;
  return json.QueryResponse.Invoice ?? [];
}

/**
 * Fetch a single invoice by id for evidence ingestion.
 */
export async function getInvoice(
  accessToken: string,
  realmId: string,
  invoiceId: string
): Promise<QuickBooksInvoice> {
  const url = `${getApiBase()}/v3/company/${encodeURIComponent(realmId)}/invoice/${encodeURIComponent(invoiceId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `QuickBooks invoice fetch failed (${res.status} for ${invoiceId}): ${body}`
    );
  }

  const json = (await res.json()) as { Invoice: QuickBooksInvoice };
  return json.Invoice;
}
