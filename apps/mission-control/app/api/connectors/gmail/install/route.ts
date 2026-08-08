/**
 * GET /api/connectors/gmail/install
 *
 * Initiates the Google OAuth 2.0 install flow for Gmail.
 *
 * Flow:
 *   1. Build a signed state param (workspaceId + timestamp, HMAC-SHA256)
 *   2. Redirect the browser to Google's authorization URL
 *
 * On return Google will hit /api/connectors/gmail/callback with the
 * code and state params.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET          — used to sign the state param
 */

import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { signConnectorState } from "@/lib/connectors/shared/oauth-state";
import { getAuthUrl, gmailOAuthConfigured } from "@/lib/connectors/gmail";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  if (!gmailOAuthConfigured()) {
    return fail("google_client_id_not_configured", 503);
  }

  const state = signConnectorState(
    ctx.workspaceId,
    ctx.userId,
    // A bearer caller's ctx.userId is an API key id, not a Clerk user, so the
    // callback cannot bind it to a session. Recording which it is keeps the
    // callback from comparing two identifiers that can never match.
    ctx.authType === "bearer" ? "api-key" : "clerk"
  );
  const authUrl = getAuthUrl({ state });

  return NextResponse.redirect(authUrl);
}
