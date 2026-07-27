/**
 * GET /api/connectors/google-drive/callback
 *
 * Handles the Google OAuth 2.0 redirect after the user approves access.
 *
 * Flow:
 *   1. Validate state signature and extract workspaceId
 *   2. Exchange authorization code for access + refresh tokens
 *   3. Store encrypted credentials and connector metadata in the repository
 *   4. Redirect user back to /settings/connectors with a success/error indicator
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   AUTH_SECRET
 */

import { repository } from "@/lib/data/repository";
import {
  connectorAppUrl,
  redirectWithConnectorError,
  redirectWithConnectorInstalled,
} from "@/lib/connectors/shared/oauth-callback";
import { verifyConnectorState } from "@/lib/connectors/shared/oauth-state";
import { exchangeCode, googleDriveOAuthConfigured } from "@/lib/connectors/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  // User denied access
  if (googleError) {
    return redirectWithConnectorError(
      appUrl,
      googleError === "access_denied" ? "access_denied" : "google_error"
    );
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Validate state to prevent CSRF
  const statePayload = verifyConnectorState(state);
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  // Check Google credentials are configured
  if (!googleDriveOAuthConfigured()) {
    return redirectWithConnectorError(appUrl, "google_not_configured");
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
      type: "google-drive",
      installedBy: "google-oauth",
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
  return redirectWithConnectorInstalled(appUrl, "Google Drive");
}
