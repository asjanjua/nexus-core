/**
 * GET /api/connectors/hubspot/files
 *
 * Lists deals from the workspace's connected HubSpot CRM account.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   after — pagination cursor
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { listDeals, refreshAccessToken } from "@/lib/connectors/hubspot";

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<string | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;

  if (!accessToken) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return accessToken;
    }
  }

  if (refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      await repository.upsertConnector({
        workspaceId,
        type,
        installedBy: "token-refresh",
        credentials: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token ?? refreshToken,
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
        },
      });
      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  return accessToken;
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const after = url.searchParams.get("after") ?? undefined;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "hubspot");

  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(ctx.workspaceId, "hubspot");
  if (!accessToken) {
    return fail("hubspot_auth_expired", 401);
  }

  try {
    const deals = await listDeals(accessToken, after);
    return ok(deals);
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
