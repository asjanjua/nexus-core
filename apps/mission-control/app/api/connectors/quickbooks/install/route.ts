/**
 * GET /api/connectors/quickbooks/install
 *
 * Initiates the Intuit OAuth 2.0 install flow for QuickBooks Online.
 *
 * Required env vars:
 *   QUICKBOOKS_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET          — used to sign the state param
 */

import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { signConnectorState } from "@/lib/connectors/shared/oauth-state";
import { getAuthUrl } from "@/lib/connectors/quickbooks";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  if (!process.env.QUICKBOOKS_CLIENT_ID) {
    return fail("quickbooks_client_id_not_configured", 503);
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
