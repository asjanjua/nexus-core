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

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  departmentField,
  evidenceHash,
  sensitivityField,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";
import {
  getIssue,
  extractAdfText,
  refreshAccessToken,
} from "@/lib/connectors/jira";
import { z } from "zod";

const ingestBodySchema = z.object({
  issueKey: z.string().min(1),
  sensitivity: sensitivityField("internal"),
  department: departmentField,
});

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

  const connector = await getActiveConnector(ctx.workspaceId, "jira");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "jira",
    refreshAccessToken,
    requiredCredentials: ["cloudId"] as const,
  });
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

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);
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
