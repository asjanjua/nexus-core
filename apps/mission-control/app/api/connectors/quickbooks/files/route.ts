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
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { listInvoices, refreshAccessToken } from "@/lib/connectors/quickbooks";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const startPosition = Number(url.searchParams.get("startPosition") ?? "1") || 1;

  const connector = await getActiveConnector(ctx.workspaceId, "quickbooks");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "quickbooks",
    refreshAccessToken,
    requiredCredentials: ["realmId"] as const,
  });
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
