/**
 * GET /api/connectors/sharepoint/callback
 *
 * Handles the Microsoft identity platform OAuth 2.0 redirect after the
 * user approves access to their SharePoint / Teams / OneDrive content.
 *
 * Flow:
 *   1. Validate state signature and extract workspaceId
 *   2. Exchange authorization code for access + refresh tokens
 *   3. Store encrypted credentials and connector metadata in the repository
 *   4. Redirect user back to /settings/connectors with a success/error indicator
 *
 * Required env vars:
 *   MICROSOFT_CLIENT_ID
 *   MICROSOFT_CLIENT_SECRET
 *   MICROSOFT_TENANT_ID (optional — defaults to "common")
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
import { exchangeCode } from "@/lib/connectors/sharepoint";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const microsoftError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  // User denied access
  if (microsoftError) {
    return redirectWithConnectorError(
      appUrl,
      microsoftError === "access_denied" ? "access_denied" : "microsoft_error"
    );
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Validate state to prevent CSRF
  // Binds the state to the signed-in caller and burns its nonce, so a
  // captured state cannot be replayed or completed by a different user.
  const statePayload = await consumeConnectorCallbackState(state, "sharepoint");
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  // Check Microsoft credentials are configured
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "microsoft_not_configured");
  }

  // Exchange code for tokens
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

  // Store encrypted credentials and connector record
  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "sharepoint",
      installedBy: "microsoft-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
      },
      config: {
        scope: tokens.scope,
        accessType: "offline",
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  // Success — redirect to connectors settings page
  return redirectWithConnectorInstalled(appUrl, "SharePoint / Teams");
}
