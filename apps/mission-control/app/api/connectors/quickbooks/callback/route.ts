/**
 * GET /api/connectors/quickbooks/callback
 *
 * Handles the Intuit OAuth 2.0 redirect after the user approves access.
 * Intuit additionally returns a `realmId` query param identifying the
 * QuickBooks company file — this is required on every Accounting API call
 * and is stored alongside the tokens.
 *
 * Required env vars:
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   AUTH_SECRET
 */

import { repository } from "@/lib/data/repository";
import {
  connectorAppUrl,
  redirectWithConnectorError,
  redirectWithConnectorInstalled,
} from "@/lib/connectors/shared/oauth-callback";
import { verifyConnectorState } from "@/lib/connectors/shared/oauth-state";
import { exchangeCode } from "@/lib/connectors/quickbooks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const intuitError = url.searchParams.get("error");

  const appUrl = connectorAppUrl();

  if (intuitError) {
    return redirectWithConnectorError(
      appUrl,
      intuitError === "access_denied" ? "access_denied" : "quickbooks_error"
    );
  }

  if (!code || !state || !realmId) {
    return redirectWithConnectorError(appUrl, "missing_params");
  }

  const statePayload = verifyConnectorState(state);
  if (!statePayload) {
    return redirectWithConnectorError(appUrl, "invalid_state");
  }

  if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET) {
    return redirectWithConnectorError(appUrl, "quickbooks_not_configured");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return redirectWithConnectorError(appUrl, encodeURIComponent(message));
  }

  if (!tokens.access_token) {
    return redirectWithConnectorError(appUrl, "token_exchange_failed");
  }

  try {
    await repository.upsertConnector({
      workspaceId: statePayload.workspaceId,
      type: "quickbooks",
      installedBy: "quickbooks-oauth",
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        obtainedAt: new Date().toISOString(),
        realmId,
      },
      config: {
        realmId,
      },
    });
  } catch {
    return redirectWithConnectorError(appUrl, "connector_store_failed");
  }

  return redirectWithConnectorInstalled(appUrl, "QuickBooks");
}
