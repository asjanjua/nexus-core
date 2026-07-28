/**
 * GET /api/connectors/linkedin/install
 *
 * Initiates the LinkedIn OAuth 2.0 install flow.
 *
 * Required env vars:
 *   LINKEDIN_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET          — used to sign the state param
 */

import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { signConnectorState } from "@/lib/connectors/shared/oauth-state";
import { getAuthUrl } from "@/lib/connectors/linkedin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  if (!process.env.LINKEDIN_CLIENT_ID) {
    return fail("linkedin_client_id_not_configured", 503);
  }

  const state = signConnectorState(ctx.workspaceId);
  const authUrl = getAuthUrl({ state });

  return NextResponse.redirect(authUrl);
}
