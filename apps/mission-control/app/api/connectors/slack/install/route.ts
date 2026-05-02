/**
 * GET /api/connectors/slack/install
 *
 * Initiates the Slack OAuth v2 install flow.
 *
 * Flow:
 *   1. Build a signed state param (workspaceId + timestamp, HMAC-SHA256)
 *   2. Redirect the browser to Slack's authorization URL
 *
 * On return Slack will hit /api/connectors/slack/callback with
 * the code and state params.
 *
 * Required env vars:
 *   SLACK_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL       — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET               — used to sign the state param (shared with lib/tokens.ts)
 */

import crypto from "crypto";
import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { NextResponse } from "next/server";

// Bot token scopes needed for evidence ingestion
const SLACK_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "users:read",
  "files:read",
].join(",");

function signState(workspaceId: string): string {
  const payload = JSON.stringify({ workspaceId, ts: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(encoded)
    .digest("hex");
  return `${encoded}.${sig}`;
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return fail("slack_client_id_not_configured", 503);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/connectors/slack/callback`;
  const state = signState(ctx.workspaceId);

  const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackAuthUrl.searchParams.set("client_id", clientId);
  slackAuthUrl.searchParams.set("scope", SLACK_SCOPES);
  slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
  slackAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(slackAuthUrl.toString());
}
