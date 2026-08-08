/**
 * GET /api/connectors/jira/callback
 *
 * Handles the Atlassian OAuth 2.0 (3LO) redirect after the user approves
 * access.
 *
 * Flow:
 *   1. Validate state signature and extract workspaceId
 *   2. Exchange authorization code for access + refresh tokens
 *   3. Resolve the accessible Jira Cloud site (cloudId) for this token
 *   4. Store encrypted credentials and connector metadata in the repository
 *   5. Redirect user back to /settings/connectors with a success/error indicator
 *
 * Required env vars:
 *   JIRA_CLIENT_ID
 *   JIRA_CLIENT_SECRET
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
import { exchangeCode, getAccessibleResources } from "@/lib/connectors/jira";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jiraError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  if (jiraError) {
    return redirectWithConnectorError(
      appUrl,
      jiraError === "access_denied" ? "access_denied" : "jira_error"
    );
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Binds the state to the signed-in caller and burns its nonce, so a
  // captured state cannot be replayed or completed by a different user.
  const statePayload = await consumeConnectorCallbackState(state, "jira");
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "jira_not_configured");
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

  // Resolve which Jira Cloud site this token can access
  let cloudId: string | undefined;
  let siteName: string | undefined;
  try {
    const resources = await getAccessibleResources(tokens.access_token);
    if (resources.length > 0) {
      cloudId = resources[0].id;
      siteName = resources[0].name;
    }
  } catch {
    return redirectWithConnectorError(appUrl, "jira_site_resolution_failed");
  }

  if (!cloudId) {
    return redirectWithConnectorError(appUrl, "jira_no_accessible_site");
  }

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "jira",
      installedBy: "jira-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
        cloudId,
      },
      config: {
        scope: tokens.scope,
        cloudId,
        siteName,
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  return redirectWithConnectorInstalled(appUrl, "Jira");
}
