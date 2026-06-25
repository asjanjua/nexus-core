/**
 * POST /api/connectors/jira/ingest
 *
 * Fetches a single Jira issue by key and pipes it through the existing
 * ingestion pipeline as text — Jira issues are JSON resources, not files,
 * so there is no binary download step.
 *
 * Request body:
 *   { issueKey: string, sensitivity?: string, department?: string }
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  getIssue,
  extractAdfText,
  refreshAccessToken,
} from "@/lib/connectors/jira";
import { z } from "zod";

const ingestBodySchema = z.object({
  issueKey: z.string().min(1),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("internal"),
  department: z.string().max(200).optional(),
});

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<{ accessToken: string; cloudId: string } | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;
  const cloudId = creds.cloudId as string | undefined;

  if (!accessToken || !cloudId) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return { accessToken, cloudId };
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
          scope: newTokens.scope,
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
          cloudId,
        },
      });
      return { accessToken: newTokens.access_token, cloudId };
    } catch {
      return null;
    }
  }

  return { accessToken, cloudId };
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const parsed = ingestBodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return fail(parsed.error.message, 400);
  }

  const { issueKey, sensitivity, department } = parsed.data;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "jira");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidAccessToken(ctx.workspaceId, "jira");
  if (!auth) {
    return fail("jira_auth_expired", 401);
  }

  let issue;
  try {
    issue = await getIssue(auth.accessToken, auth.cloudId, issueKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  const description = extractAdfText(issue.fields.description);
  const text = [
    `Summary: ${issue.fields.summary}`,
    `Type: ${issue.fields.issuetype?.name ?? "unknown"}`,
    `Status: ${issue.fields.status?.name ?? "unknown"}`,
    `Project: ${issue.fields.project?.name ?? "unknown"} (${issue.fields.project?.key ?? "?"})`,
    `Assignee: ${issue.fields.assignee?.displayName ?? "unassigned"}`,
    `Reporter: ${issue.fields.reporter?.displayName ?? "unknown"}`,
    `Labels: ${(issue.fields.labels ?? []).join(", ") || "none"}`,
    `Created: ${issue.fields.created}`,
    `Updated: ${issue.fields.updated}`,
    "",
    description,
  ].join("\n");

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");
  const siteUrl = (connector.config as Record<string, unknown> | undefined)?.siteName;

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "jira",
      department,
      connectorInstanceId,
      sourcePath: `jira://${auth.cloudId}/issue/${issue.key}`,
      sourceUri: typeof siteUrl === "string" ? `${siteUrl}/browse/${issue.key}` : undefined,
      sourceTimestamp: issue.fields.updated,
      hash,
      sensitivity,
      extractionConfidence: 0.9,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, issueKey: issue.key });
}
