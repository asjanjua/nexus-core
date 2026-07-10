/**
 * GET /api/connectors/quickbooks/files
 *
 * Lists invoices from the workspace's connected QuickBooks company file.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   startPosition — 1-based pagination offset
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { listInvoices, refreshAccessToken } from "@/lib/connectors/quickbooks";

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<{ accessToken: string; realmId: string } | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;
  const realmId = creds.realmId as string | undefined;

  if (!accessToken || !realmId) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return { accessToken, realmId };
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
          realmId,
        },
      });
      return { accessToken: newTokens.access_token, realmId };
    } catch {
      return null;
    }
  }

  return { accessToken, realmId };
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const startPosition = Number(url.searchParams.get("startPosition") ?? "1") || 1;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "quickbooks");

  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidAccessToken(ctx.workspaceId, "quickbooks");
  if (!auth) {
    return fail("quickbooks_auth_expired", 401);
  }

  try {
    const invoices = await listInvoices(auth.accessToken, auth.realmId, startPosition);
    return ok({ invoices, startPosition });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
