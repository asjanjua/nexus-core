/**
 * HubSpot OAuth 2.0 connector client.
 *
 * Pure fetch — no HubSpot SDK dependency. Follows the same zero-SDK
 * pattern used by the Google Drive and SharePoint connectors.
 *
 * OAuth 2.0 flow:
 *   1. getAuthUrl()      → redirect user to HubSpot consent screen
 *   2. HubSpot redirects → /api/connectors/hubspot/callback?code=...&state=...
 *   3. exchangeCode()    → POST to token endpoint for access + refresh tokens
 *   4. refreshAccessToken() → use refresh token when access token expires
 *
 * Required env vars:
 *   HUBSPOT_CLIENT_ID
 *   HUBSPOT_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 */

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_API = "https://api.hubapi.com";

const HUBSPOT_SCOPE =
  "crm.objects.deals.read crm.objects.contacts.read crm.objects.companies.read";

function getClientId(): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) throw new Error("HUBSPOT_CLIENT_ID is not configured");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!secret) throw new Error("HUBSPOT_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connectors/hubspot/callback`;
}

// ---------------------------------------------------------------------------
// Auth URL generation
// ---------------------------------------------------------------------------

export interface HubSpotAuthUrlParams {
  state: string;
}

export function getAuthUrl(params: HubSpotAuthUrlParams): string {
  const url = new URL(HUBSPOT_AUTH_URL);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("scope", HUBSPOT_SCOPE);
  url.searchParams.set("state", params.state);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface HubSpotTokenError {
  status?: string;
  message?: string;
  error?: string;
}

export async function exchangeCode(code: string): Promise<HubSpotTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    code,
  });

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as HubSpotTokenError;
    throw new Error(
      `HubSpot token exchange failed: ${err.error ?? err.status ?? res.status}${
        err.message ? ` — ${err.message}` : ""
      }`
    );
  }

  return json as HubSpotTokens;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<HubSpotTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
  });

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = json as HubSpotTokenError;
    throw new Error(
      `HubSpot token refresh failed: ${err.error ?? err.status ?? res.status}${
        err.message ? ` — ${err.message}` : ""
      }`
    );
  }

  return json as HubSpotTokens;
}

// ---------------------------------------------------------------------------
// CRM API — deals
// ---------------------------------------------------------------------------

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    hs_lastmodifieddate?: string;
    [key: string]: string | undefined;
  };
}

export interface HubSpotDealList {
  results: HubSpotDeal[];
  paging?: { next?: { after: string } };
}

/**
 * List deals from the connected HubSpot CRM account.
 *
 * @param accessToken - Valid HubSpot OAuth access token
 * @param after       - Pagination cursor
 */
export async function listDeals(
  accessToken: string,
  after?: string
): Promise<HubSpotDealList> {
  const url = new URL(`${HUBSPOT_API}/crm/v3/objects/deals`);
  url.searchParams.set("limit", "50");
  url.searchParams.set(
    "properties",
    "dealname,amount,dealstage,pipeline,closedate,createdate,hs_lastmodifieddate"
  );
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString(), {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot deal list failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<HubSpotDealList>;
}

/**
 * Fetch a single deal by id for evidence ingestion.
 */
export async function getDeal(
  accessToken: string,
  dealId: string
): Promise<HubSpotDeal> {
  const url = new URL(`${HUBSPOT_API}/crm/v3/objects/deals/${encodeURIComponent(dealId)}`);
  url.searchParams.set(
    "properties",
    "dealname,amount,dealstage,pipeline,closedate,createdate,hs_lastmodifieddate"
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot deal fetch failed (${res.status} for ${dealId}): ${body}`);
  }

  return res.json() as Promise<HubSpotDeal>;
}
