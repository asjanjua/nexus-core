/**
 * GET /api/connectors/slack/callback
 *
 * Handles the Slack OAuth v2 redirect after the user approves the app install.
 *
 * Flow:
 *   1. Validate state signature and extract workspaceId
 *   2. Exchange authorization code for bot token via Slack's oauth.v2.access API
 *   3. Store encrypted credentials and connector metadata in the repository
 *   4. Redirect user back to /settings/connectors with a success/error indicator
 *
 * Required env vars:
 *   SLACK_CLIENT_ID
 *   SLACK_CLIENT_SECRET
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

// ---------------------------------------------------------------------------
// Slack token exchange
// ---------------------------------------------------------------------------

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  bot_user_id?: string;
  team?: { id: string; name: string };
  authed_user?: { id: string };
  scope?: string;
};

async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<SlackOAuthResponse> {
  const clientId = process.env.SLACK_CLIENT_ID ?? "";
  const clientSecret = process.env.SLACK_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  return res.json() as Promise<SlackOAuthResponse>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const slackError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  // User denied the install
  if (slackError) {
    return redirectWithConnectorError(appUrl, slackError === "access_denied" ? "access_denied" : "slack_error");
  }

  if (!code || !state) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  // Validate state to prevent CSRF
  const statePayload = verifyConnectorState(state);
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  // Check Slack credentials are configured
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "slack_not_configured");
  }

  // Exchange code for token
  const redirectUri = `${appUrl}/api/connectors/slack/callback`;
  const token = await exchangeCode(code, redirectUri);

  if (!token.ok || !token.access_token) {
    return redirectWithConnectorError(appUrl, token.error ?? "token_exchange_failed");
  }

  // Store encrypted credentials and connector record
  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "slack",
      installedBy: token.authed_user?.id ?? "slack-oauth",
      credentials: {
        botToken: token.access_token,
        botUserId: token.bot_user_id,
        teamId: token.team?.id,
        teamName: token.team?.name,
        scope: token.scope,
      },
      config: {
        teamId: token.team?.id,
        teamName: token.team?.name,
        scope: token.scope,
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  // Success — redirect to connectors settings page
  return redirectWithConnectorInstalled(appUrl, "slack");
}
