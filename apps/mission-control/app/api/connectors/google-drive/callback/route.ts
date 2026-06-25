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

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";
import { exchangeCode } from "@/lib/connectors/google-drive";

// ---------------------------------------------------------------------------
// State verification
// ---------------------------------------------------------------------------

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

  // Reject states older than 10 minutes
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
  const googleError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // User denied access
  if (googleError) {
    return redirectWithError(
      appUrl,
      googleError === "access_denied" ? "access_denied" : "google_error"
    );
  }

  if (!code || !state) {
    return redirectWithError(appUrl, "missing_params");
  }

  // Validate state to prevent CSRF
  const statePayload = verifyState(state);
  if (!statePayload) {
    return redirectWithError(appUrl, "invalid_state");
  }

  // Check Google credentials are configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirectWithError(appUrl, "google_not_configured");
  }

  // Exchange code for tokens
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
    return redirectWithError(appUrl, "connector_store_failed");
  }

  // Success — redirect to connectors settings page
  const successUrl = new URL("/settings/connectors", appUrl);
  successUrl.searchParams.set("installed", "Google Drive");
  return NextResponse.redirect(successUrl.toString());
}
