/**
 * GET /api/connectors/github/callback
 *
 * Handles the GitHub OAuth 2.0 redirect after the user approves access.
 *
 * Flow:
 *   1. Validate state signature and extract workspaceId
 *   2. Exchange authorization code for an access token
 *   3. Store encrypted credentials and connector metadata in the repository
 *   4. Redirect user back to /settings/connectors with a success/error indicator
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
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
import { exchangeCode } from "@/lib/connectors/github";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const githubError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  if (githubError) {
    return redirectWithConnectorError(
      appUrl,
      githubError === "access_denied" ? "access_denied" : "github_error"
    );
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Binds the state to the signed-in caller and burns its nonce, so a
  // captured state cannot be replayed or completed by a different user.
  const statePayload = await consumeConnectorCallbackState(state, "github");
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "github_not_configured");
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

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "github",
      installedBy: "github-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
      },
      config: {
        scope: tokens.scope,
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  return redirectWithConnectorInstalled(appUrl, "GitHub");
}
