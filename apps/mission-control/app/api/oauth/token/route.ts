/**
 * OAuth 2.0 Client Credentials token endpoint.
 *
 * Compatible with standard OAuth2 client_credentials flow so any agent
 * or tool (Codex, Claude tools, custom scripts) can authenticate:
 *
 *   POST /api/oauth/token
 *   Content-Type: application/x-www-form-urlencoded
 *
 *   grant_type=client_credentials
 *   &client_id=<workspaceId>
 *   &client_secret=<agentKeySecret>
 *   &scope=read:dashboard read:recommendations
 *
 * Returns a short-lived Bearer token (JWT-style HMAC) that can be used
 * against all /api/* routes by setting:  Authorization: Bearer <token>
 *
 * The token encodes { workspaceId, keyId, scopes, exp } and is verified
 * by the middleware / route handlers that need scope checking.
 */

import { agentScopeSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { NextResponse } from "next/server";
import { signToken, TOKEN_TTL_SECONDS } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let grantType: string | null = null;
  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let scopeStr: string | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    grantType = params.get("grant_type");
    clientId = params.get("client_id");
    clientSecret = params.get("client_secret");
    scopeStr = params.get("scope");
  } else {
    // Also accept JSON for agent convenience
    const body = await request.json().catch(() => ({})) as Record<string, string>;
    grantType = body.grant_type ?? null;
    clientId = body.client_id ?? null;
    clientSecret = body.client_secret ?? null;
    scopeStr = body.scope ?? null;
  }

  if (grantType !== "client_credentials") {
    return NextResponse.json(
      { error: "unsupported_grant_type" },
      { status: 400 }
    );
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Verify agent key
  const agentKey = await repository.verifyAgentKey(clientSecret, clientId);
  if (!agentKey) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Parse requested scopes and intersect with key's allowed scopes
  const requestedScopes = (scopeStr?.split(/\s+/) ?? []).filter((s) =>
    agentScopeSchema.safeParse(s).success
  );
  const grantedScopes =
    requestedScopes.length
      ? requestedScopes.filter((s) => agentKey.scopes.includes(s as never))
      : agentKey.scopes;

  if (!grantedScopes.length) {
    return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const tokenPayload = {
    workspaceId: agentKey.workspaceId,
    keyId: agentKey.id,
    scopes: grantedScopes,
    exp
  };

  const accessToken = signToken(tokenPayload);

  // Return in standard OAuth2 format
  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    scope: grantedScopes.join(" ")
  });
}
