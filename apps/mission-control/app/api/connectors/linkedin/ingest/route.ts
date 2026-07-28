/**
 * POST /api/connectors/linkedin/ingest
 *
 * Fetches a single LinkedIn company-page post by id and pipes it through
 * the existing ingestion pipeline as text — posts are JSON social-media
 * resources, not files, so there is no binary download step.
 *
 * Request body:
 *   { postId: string, sensitivity?: string, department?: string }
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
import { getPost, refreshAccessToken } from "@/lib/connectors/linkedin";
import { z } from "zod";

const ingestBodySchema = z.object({
  postId: z.string().min(1),
  sensitivity: sensitivityField("public"),
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

  const { postId, sensitivity, department } = parsed.data;

  const connector = await getActiveConnector(ctx.workspaceId, "linkedin");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "linkedin",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("linkedin_auth_expired", 401);
  }

  let post;
  try {
    post = await getPost(accessToken, postId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  const text = [
    `Author: ${post.author}`,
    `Visibility: ${post.visibility ?? "unknown"}`,
    `Created: ${post.createdAt ? new Date(post.createdAt).toISOString() : "unknown"}`,
    "",
    post.commentary ?? "",
  ].join("\n");

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "social_export",
      department,
      connectorInstanceId,
      sourcePath: `linkedin://posts/${postId}`,
      sourceTimestamp: post.lastModifiedAt
        ? new Date(post.lastModifiedAt).toISOString()
        : new Date().toISOString(),
      hash,
      sensitivity,
      extractionConfidence: 0.85,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, postId });
}
