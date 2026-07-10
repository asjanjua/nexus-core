/**
 * GET /api/connectors/linkedin/callback
 *
 * Handles the LinkedIn OAuth 2.0 redirect after the user approves access.
 * Also resolves the first administered organization (company page) so
 * later ingest calls have a default orgUrn without an extra round trip,
 * if the "rw_organization_admin" scope was granted.
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   AUTH_SECRET
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";
import { exchangeCode, listAdministeredOrgs } from "@/lib/connectors/linkedin";

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
  const linkedinError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (linkedinError) {
    return redirectWithError(
      appUrl,
      linkedinError === "user_cancelled_login" || linkedinError === "user_cancelled_authorize"
        ? "access_denied"
        : "linkedin_error"
    );
  }

  if (!code || !state) {
    return redirectWithError(appUrl, "missing_params");
  }

  const statePayload = verifyState(state);
  if (!statePayload) {
    return redirectWithError(appUrl, "invalid_state");
  }

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return redirectWithError(appUrl, "linkedin_not_configured");
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

  // Best-effort: resolve the first administered org. Not fatal if it
  // fails (e.g. Community Management API not yet approved for this app).
  let defaultOrgUrn: string | undefined;
  try {
    const orgs = await listAdministeredOrgs(tokens.access_token);
    if (orgs.length > 0) defaultOrgUrn = orgs[0].organizationalTarget;
  } catch {
    defaultOrgUrn = undefined;
  }

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "linkedin",
      installedBy: "linkedin-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
        defaultOrgUrn,
      },
      config: {
        scope: tokens.scope,
        defaultOrgUrn,
      },
    });
  } catch {
    return redirectWithError(appUrl, "connector_store_failed");
  }

  const successUrl = new URL("/settings/connectors", appUrl);
  successUrl.searchParams.set("installed", "LinkedIn");
  return NextResponse.redirect(successUrl.toString());
}
