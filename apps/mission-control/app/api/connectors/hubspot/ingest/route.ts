/**
 * POST /api/connectors/hubspot/ingest
 *
 * Fetches a single deal from HubSpot by id and pipes it through the
 * existing ingestion pipeline as text — deals are JSON CRM records, not
 * files, so there is no binary download step.
 *
 * Request body:
 *   { dealId: string, sensitivity?: string, department?: string }
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
import { getDeal, refreshAccessToken } from "@/lib/connectors/hubspot";
import { z } from "zod";

const ingestBodySchema = z.object({
  dealId: z.string().min(1),
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

  const { dealId, sensitivity, department } = parsed.data;

  const connector = await getActiveConnector(ctx.workspaceId, "hubspot");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "hubspot",
    refreshAccessToken,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("hubspot_auth_expired", 401);
  }

  let deal;
  try {
    deal = await getDeal(accessToken, dealId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  const p = deal.properties;
  const text = [
    `Deal: ${p.dealname ?? "(unnamed)"}`,
    `Amount: ${p.amount ?? "unknown"}`,
    `Stage: ${p.dealstage ?? "unknown"}`,
    `Pipeline: ${p.pipeline ?? "unknown"}`,
    `Close date: ${p.closedate ?? "unset"}`,
    `Created: ${p.createdate ?? "unknown"}`,
    `Last modified: ${p.hs_lastmodifieddate ?? "unknown"}`,
  ].join("\n");

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "crm",
      department,
      connectorInstanceId,
      sourcePath: `hubspot://deals/${deal.id}`,
      sourceUri: `https://app.hubspot.com/contacts/deals/${deal.id}`,
      sourceTimestamp: p.hs_lastmodifieddate ?? new Date().toISOString(),
      hash,
      sensitivity,
      extractionConfidence: 0.9,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, dealId: deal.id });
}
