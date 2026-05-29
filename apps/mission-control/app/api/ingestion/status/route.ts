import crypto from "crypto";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { sensitivitySchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ingestEvidence, MAX_UPLOAD_BYTES } from "@/lib/services/ingestion";
import { extractTextFromBuffer } from "@/lib/services/extract";
import { isOriginalStorageEnabled, storeOriginalFile } from "@/lib/services/object-storage";
import { requireScope } from "@/lib/api-auth";
import { generateRecommendations } from "@/lib/services/recommendations";

export const runtime = "nodejs";

const formSchema = z.object({
  workspaceId: z.string().default("workspace-demo"),
  tenantId: z.string().default("tenant-demo"),
  sourceType: z.string().default("upload"),
  sourcePath: z.string().optional(),
  sourceUri: z.string().optional(),
  sourceTimestamp: z.string().optional(),
  sensitivity: sensitivitySchema.default("internal")
});

function asOptionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;
  const url = new URL(request.url);
  const requestedWorkspaceId = url.searchParams.get("workspaceId");
  const workspaceId =
    ctx.authType === "session"
      ? ctx.workspaceId
      : requestedWorkspaceId ?? ctx.workspaceId;
  const rows = await repository.getEvidenceForWorkspace(workspaceId);
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.ingestionStatus] = (acc[row.ingestionStatus] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.sourceType] = (acc[row.sourceType] ?? 0) + 1;
    return acc;
  }, {});

  return ok({
    workspaceId,
    total: rows.length,
    byStatus,
    bySource,
    connectors: {
      slack: "configured",
      googleDrive: "configured",
      teams: "deferred"
    }
  });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:ingest");
  if (error) return error;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("file_required", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("file_too_large", 413);

  const parsed = formSchema.safeParse({
    workspaceId: asOptionalString(form.get("workspaceId")),
    tenantId: asOptionalString(form.get("tenantId")),
    sourceType: asOptionalString(form.get("sourceType")),
    sourcePath: asOptionalString(form.get("sourcePath")),
    sourceUri: asOptionalString(form.get("sourceUri")),
    sourceTimestamp: asOptionalString(form.get("sourceTimestamp")),
    sensitivity: asOptionalString(form.get("sensitivity"))
  });
  if (!parsed.success) return fail("invalid_metadata", 400);
  const workspaceId = ctx.workspaceId;
  const tenantId = ctx.workspaceId;

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = `sha256:${crypto.createHash("sha256").update(buf).digest("hex")}`;
  let storedOriginalUri = parsed.data.sourceUri;

  if (isOriginalStorageEnabled()) {
    try {
      const stored = await storeOriginalFile({
        workspaceId,
        fileName: file.name,
        contentType: file.type,
        hash,
        buffer: buf
      });
      storedOriginalUri = stored?.sourceUri ?? storedOriginalUri;
    } catch (error) {
      await repository.pushAudit({
        workspaceId,
        type: "ingestion_original_storage_failed",
        actor: "mission_control_upload",
        payload: {
          fileName: file.name,
          error: error instanceof Error ? error.message : "unknown_error"
        }
      });
    }
  }

  const extracted = await extractTextFromBuffer(file.name, buf);

  const record = await ingestEvidence({
    workspaceId,
    tenantId,
    sourceType: parsed.data.sourceType,
    sourcePath: parsed.data.sourcePath ?? `/uploads/${file.name}`,
    sourceUri: storedOriginalUri,
    sourceTimestamp: parsed.data.sourceTimestamp ?? new Date().toISOString(),
    hash,
    sensitivity: parsed.data.sensitivity,
    extractionConfidence: extracted.extractionConfidence,
    text: extracted.text
  });

  await repository.pushAudit({
    workspaceId: record.workspaceId,
    type: "ingestion_extraction_completed",
    actor: "mission_control_upload",
    payload: {
      evidenceId: record.id,
      extractionMethod: extracted.method,
      extractedCharCount: extracted.charCount
    }
  });

  if (storedOriginalUri?.startsWith("r2://")) {
    await repository.pushAudit({
      workspaceId: record.workspaceId,
      type: "ingestion_original_stored",
      actor: "mission_control_upload",
      payload: {
        evidenceId: record.id,
        sourceUri: storedOriginalUri
      }
    });
  }

  // Fire-and-forget: generate recommendations when evidence reaches processed state.
  // Do not await — this runs in the background and never blocks the upload response.
  if (record.ingestionStatus === "processed") {
    void generateRecommendations(workspaceId).catch(() => {});
  }

  return ok({
    id: record.id,
    sourcePath: record.sourcePath,
    sourceUri: record.sourceUri ?? null,
    ingestionStatus: record.ingestionStatus,
    extractionConfidence: record.extractionConfidence
  });
}
