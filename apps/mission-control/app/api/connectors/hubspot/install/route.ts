/**
 * GET /api/connectors/hubspot/install
 *
 * Initiates the HubSpot OAuth 2.0 install flow.
 *
 * Required env vars:
 *   HUBSPOT_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL  — e.g. https://nexus.yourdomain.com
 *   AUTH_SECRET          — used to sign the state param
 */

import crypto from "crypto";
import { fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { requireAuthSecret } from "@/lib/security";
import { getAuthUrl } from "@/lib/connectors/hubspot";
import { NextResponse } from "next/server";

function signState(workspaceId: string): string {
  const payload = JSON.stringify({ workspaceId, ts: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", requireAuthSecret())
    .update(encoded)
    .digest("hex");
  return `${encoded}.${sig}`;
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  if (!process.env.HUBSPOT_CLIENT_ID) {
    return fail("hubspot_client_id_not_configured", 503);
  }

  const state = signState(ctx.workspaceId);
  const authUrl = getAuthUrl({ state });

  return NextResponse.redirect(authUrl);
}
