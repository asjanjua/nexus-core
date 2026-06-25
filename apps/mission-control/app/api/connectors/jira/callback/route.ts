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

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";
import { exchangeCode, getAccessibleResources } from "@/lib/connectors/jira";

type StatePayload = { workspaceId: string; ts: number };

function verifyState(state: string): StatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  const expected = crypto
    .createHmac("sha256", requireAuthSecret())
    .update(encoded)
    .digest("hex");

  if (!timingSafeEqualString(expected, sig, "hex")) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    ) as StatePayload;
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function redirectWithError(appUrl: string, error: string): NextResponse {
  const url = new URL("/settings/connectors", appUrl);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jiraError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (jiraError) {
    return redirectWithError(
      appUrl,
      jiraError === "access_denied" ? "access_denied" : "jira_error"
    );
  }

  if (!code || !state) {
    return redirectWithError(appUrl, "missing_params");
  }

  const statePayload = verifyState(state);
  if (!statePayload) {
    return redirectWithError(appUrl, "invalid_state");
  }

  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    return redirectWithError(appUrl, "jira_not_configured");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return redirectWithError(appUrl, encodeURIComponent(message));
  }

  if (!tokens.access_token) {
    return redirectWithError(appUrl, "token_exchange_failed");
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
    return redirectWithError(appUrl, "jira_site_resolution_failed");
  }

  if (!cloudId) {
    return redirectWithError(appUrl, "jira_no_accessible_site");
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
    return redirectWithError(appUrl, "connector_store_failed");
  }

  const successUrl = new URL("/settings/connectors", appUrl);
  successUrl.searchParams.set("installed", "Jira");
  return NextResponse.redirect(successUrl.toString());
}
