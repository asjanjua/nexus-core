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

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

// ---------------------------------------------------------------------------
// State verification
// ---------------------------------------------------------------------------

type StatePayload = { workspaceId: string; ts: number };

function verifyState(state: string): StatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  const expected = crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(encoded)
    .digest("hex");

  // Timing-safe comparison
  const left = Buffer.from(expected, "utf-8");
  const right = Buffer.from(sig, "utf-8");
  if (left.length !== right.length) return null;
  if (!crypto.timingSafeEqual(left, right)) return null;

  // Reject states older than 10 minutes
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as StatePayload;
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

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

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function redirectWithError(appUrl: string, error: string): NextResponse {
  const url = new URL("/settings/connectors", appUrl);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const slackError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // User denied the install
  if (slackError) {
    return redirectWithError(appUrl, slackError === "access_denied" ? "access_denied" : "slack_error");
  }

  if (!code || !state) {
    return redirectWithError(appUrl, "missing_params");
  }

  // Validate state to prevent CSRF
  const statePayload = verifyState(state);
  if (!statePayload) {
    return redirectWithError(appUrl, "invalid_state");
  }

  // Check Slack credentials are configured
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
    return redirectWithError(appUrl, "slack_not_configured");
  }

  // Exchange code for token
  const redirectUri = `${appUrl}/api/connectors/slack/callback`;
  const token = await exchangeCode(code, redirectUri);

  if (!token.ok || !token.access_token) {
    return redirectWithError(appUrl, token.error ?? "token_exchange_failed");
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
    return redirectWithError(appUrl, "connector_store_failed");
  }

  // Success — redirect to connectors settings page
  const successUrl = new URL("/settings/connectors", appUrl);
  successUrl.searchParams.set("installed", "slack");
  return NextResponse.redirect(successUrl.toString());
}
