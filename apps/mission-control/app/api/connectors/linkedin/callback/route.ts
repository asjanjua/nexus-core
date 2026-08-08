/**
 * GET /api/connectors/linkedin/callback
 *
 * Handles the LinkedIn OAuth 2.0 redirect after the user approves access.
 * Also resolves the first administered organization (company page) so
 * later ingest calls have a default orgUrn without an extra round trip,
 * if the "rw_organization_admin" scope was granted.
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   AUTH_SECRET
 */

import { repository } from "@/lib/data/repository";
import {
  connectorAppUrl,
  redirectWithConnectorError,
  redirectWithConnectorInstalled,
} from "@/lib/connectors/shared/oauth-callback";
import { consumeConnectorCallbackState } from "@/lib/connectors/shared/oauth-callback-state";
import { exchangeCode, listAdministeredOrgs } from "@/lib/connectors/linkedin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const linkedinError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  if (linkedinError) {
    return redirectWithConnectorError(
      appUrl,
      linkedinError === "user_cancelled_login" || linkedinError === "user_cancelled_authorize"
        ? "access_denied"
        : "linkedin_error"
    );
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Binds the state to the signed-in caller and burns its nonce, so a
  // captured state cannot be replayed or completed by a different user.
  const statePayload = await consumeConnectorCallbackState(state, "linkedin");
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "linkedin_not_configured");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return redirectWithConnectorError(appUrl, encodeURIComponent(message));
  }

  if (!tokens.access_token) {
    return redirectWithConnectorError(appUrl, "token_exchange_failed");
  }

  // Best-effort: resolve the first administered org. Not fatal if it
  // fails (e.g. Community Management API not yet approved for this app).
  let defaultOrgUrn: string | undefined;
  try {
    const orgs = await listAdministeredOrgs(tokens.access_token);
    if (orgs.length > 0) defaultOrgUrn = orgs[0].organizationalTarget;
  } catch {
    defaultOrgUrn = undefined;
  }

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "linkedin",
      installedBy: "linkedin-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
        defaultOrgUrn,
      },
      config: {
        scope: tokens.scope,
        defaultOrgUrn,
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  return redirectWithConnectorInstalled(appUrl, "LinkedIn");
}
