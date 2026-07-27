/**
 * GET /api/connectors/github/install
 *
 * Initiates the GitHub OAuth 2.0 install flow.
 *
 * Flow:
 *   1. Build a signed state param (workspaceId + timestamp, HMAC-SHA256)
 *   2. Redirect the browser to GitHub's authorization URL
 *
 * On return GitHub will hit /api/connectors/github/callback with the
 * code and state params.
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET          — used to sign the state param
 */

import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { signConnectorState } from "@/lib/connectors/shared/oauth-state";
import { getAuthUrl } from "@/lib/connectors/github";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  if (!process.env.GITHUB_CLIENT_ID) {
    return fail("github_client_id_not_configured", 503);
  }

  const state = signConnectorState(ctx.workspaceId);
  const authUrl = getAuthUrl({ state });

  return NextResponse.redirect(authUrl);
}
