/**
 * Connector lookup and access-token freshness shared by connector
 * files/ingest routes.
 *
 * Every OAuth connector stores `accessToken`/`refreshToken`/`expiresIn`/
 * `obtainedAt` credentials and refreshes them the same way; providers only
 * differ in the refresh call and in the extra credential fields (Jira
 * `cloudId`, QuickBooks `realmId`, LinkedIn `defaultOrgUrn`) they need
 * alongside the token.
 */

import { repository, type ConnectorRecord } from "@/lib/data/repository";
import { captureHandledError } from "@/lib/observability/sentry";

export type RefreshedTokens = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
};

export type ConnectorAuth<
  R extends string = never,
  O extends string = never,
> = { accessToken: string } & Record<R, string> & Partial<Record<O, string>>;

const EXPIRY_BUFFER_SECONDS = 60;

export async function getActiveConnector(
  workspaceId: string,
  type: string
): Promise<ConnectorRecord | null> {
  const connectors = await repository.listConnectors(workspaceId);
  const connector = connectors.find((c) => c.type === type);
  if (!connector || connector.status !== "active") return null;
  return connector;
}

function isFresh(obtainedAt?: string, expiresIn?: number): boolean {
  if (!obtainedAt || !expiresIn) return false;
  const expiresAt =
    new Date(obtainedAt).getTime() + (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;
  return Date.now() < expiresAt;
}

/**
 * Returns a usable access token for the connector, refreshing it first when
 * it has expired and a refresh token is stored. Returns null when no usable
 * token can be produced.
 *
 * `requiredCredentials` fields must be present or the connector is treated as
 * unusable; `optionalCredentials` are returned when present.
 * `treatMissingExpiryAsFresh` covers providers whose tokens do not expire
 * (classic GitHub OAuth app tokens).
 */
export async function getValidConnectorAuth<
  R extends string = never,
  O extends string = never,
>(params: {
  workspaceId: string;
  type: string;
  refreshAccessToken: (refreshToken: string) => Promise<RefreshedTokens>;
  requiredCredentials?: readonly R[];
  optionalCredentials?: readonly O[];
  treatMissingExpiryAsFresh?: boolean;
}): Promise<ConnectorAuth<R, O> | null> {
  const { workspaceId, type } = params;
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;

  if (!accessToken) return null;

  const extras: Record<string, string> = {};
  for (const key of params.requiredCredentials ?? []) {
    const value = creds[key];
    if (typeof value !== "string") return null;
    extras[key] = value;
  }
  for (const key of params.optionalCredentials ?? []) {
    const value = creds[key];
    if (typeof value === "string") extras[key] = value;
  }

  const auth = (accessTokenValue: string) =>
    ({ ...extras, accessToken: accessTokenValue }) as ConnectorAuth<R, O>;

  if (isFresh(obtainedAt, expiresIn)) {
    return auth(accessToken);
  }

  if (params.treatMissingExpiryAsFresh && !expiresIn) {
    return auth(accessToken);
  }

  if (refreshToken) {
    try {
      const newTokens = await params.refreshAccessToken(refreshToken);
      await repository.upsertConnector({
        workspaceId,
        type,
        installedBy: "token-refresh",
        credentials: {
          ...creds,
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token ?? refreshToken,
          scope: newTokens.scope ?? creds.scope,
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
        },
      });
      return auth(newTokens.access_token);
    } catch (error) {
      // Callers intentionally receive null so they can return a safe
      // connector-not-active response; preserve that fallback while making
      // refresh failures observable.
      captureHandledError(error, {
        route: "connectors.shared.getValidConnectorAuth",
        errorType: "connector_token_refresh_failed",
        workspaceId,
        extra: { connectorType: type },
      });
      return null;
    }
  }

  return auth(accessToken);
}
