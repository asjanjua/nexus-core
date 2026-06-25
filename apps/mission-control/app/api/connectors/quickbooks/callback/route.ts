/**
 * GET /api/connectors/quickbooks/callback
 *
 * Handles the Intuit OAuth 2.0 redirect after the user approves access.
 * Intuit additionally returns a `realmId` query param identifying the
 * QuickBooks company file — this is required on every Accounting API call
 * and is stored alongside the tokens.
 *
 * Required env vars:
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   AUTH_SECRET
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";
import { exchangeCode } from "@/lib/connectors/quickbooks";

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
  const realmId = url.searchParams.get("realmId");
  const intuitError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (intuitError) {
    return redirectWithError(
      appUrl,
      intuitError === "access_denied" ? "access_denied" : "quickbooks_error"
    );
  }

  if (!code || !state || !realmId) {
    return redirectWithError(appUrl, "missing_params");
  }

  const statePayload = verifyState(state);
  if (!statePayload) {
    return redirectWithError(appUrl, "invalid_state");
  }

  if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET) {
    return redirectWithError(appUrl, "quickbooks_not_configured");
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

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "quickbooks",
      installedBy: "quickbooks-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
        realmId,
      },
      config: {
        realmId,
      },
    });
  } catch {
    return redirectWithError(appUrl, "connector_store_failed");
  }

  const successUrl = new URL("/settings/connectors", appUrl);
  successUrl.searchParams.set("installed", "QuickBooks");
  return NextResponse.redirect(successUrl.toString());
}
