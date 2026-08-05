import crypto from "crypto";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { evidenceSourceTypeSchema, sensitivitySchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { contentTypeForUpload, ingestEvidence, MAX_UPLOAD_BYTES } from "@/lib/services/ingestion";
import { checkEvidenceLimit } from "@/lib/billing/budget";
import { extractTextFromBuffer } from "@/lib/services/extract";
import { isOriginalStorageEnabled, storeOriginalFile } from "@/lib/services/object-storage";
import { requireScope } from "@/lib/api-auth";
import { generateRecommendations } from "@/lib/services/recommendations";
import { classifyFilename } from "@/lib/services/company-classification";

export const runtime = "nodejs";

const formSchema = z.object({
  workspaceId: z.string().default("workspace-demo"),
  tenantId: z.string().default("tenant-demo"),
  sourceType: evidenceSourceTypeSchema.default("upload"),
  connectorInstanceId: z.string().optional(),
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
  // Authz: always the caller's own workspace. Bearer tokens are already scoped
  // to a workspace; a caller-supplied workspaceId must never override it.
  const workspaceId = ctx.workspaceId;
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

  // Demo mode: block real ingestion to prevent accidental data entry during sales demos
  const wsSettings = await repository.getWorkspaceSettings(ctx.workspaceId);
  if (wsSettings?.demoMode) {
    return fail("demo_mode_active: ingestion is disabled in demo workspaces. Disable demo mode in Settings to upload real documents.", 403);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("file_required", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("file_too_large", 413);

  // Content type is derived from the allowlisted extension, never taken from
  // the client-supplied file.type.
  const uploadContentType = contentTypeForUpload(file.name);
  if (!uploadContentType) return fail("unsupported_file_type", 415);

  const parsed = formSchema.safeParse({
    workspaceId: asOptionalString(form.get("workspaceId")),
    tenantId: asOptionalString(form.get("tenantId")),
    sourceType: asOptionalString(form.get("sourceType")),
    connectorInstanceId: asOptionalString(form.get("connectorInstanceId")),
    sourcePath: asOptionalString(form.get("sourcePath")),
    sourceUri: asOptionalString(form.get("sourceUri")),
    sourceTimestamp: asOptionalString(form.get("sourceTimestamp")),
    sensitivity: asOptionalString(form.get("sensitivity"))
  });
  if (!parsed.success) return fail("invalid_metadata", 400);
  const workspaceId = ctx.workspaceId;
  const tenantId = ctx.workspaceId;

  // Auto-classify department and elevate sensitivity using workspace sector if not supplied by caller
  const rawDepartment = asOptionalString(form.get("department"));
  const rawSourceType = asOptionalString(form.get("sourceType"));
  const profile = await repository.getWorkspaceProfile(workspaceId).catch(() => null);
  const fileCls = classifyFilename(file.name, profile?.sector ?? "");
  const department = rawDepartment ?? fileCls.department;
  const sourceType = evidenceSourceTypeSchema.parse(rawSourceType ?? fileCls.sourceType ?? parsed.data.sourceType);
  // Respect caller-supplied sensitivity but fall back to sector-aware default
  const callerSensitivity = asOptionalString(form.get("sensitivity"));
  const effectiveSensitivity = (callerSensitivity ?? fileCls.sensitivity) as
    | "public" | "internal" | "confidential" | "restricted";

  // Checked HERE as well as inside ingestEvidence, and specifically before the
  // R2 write below. The chokepoint in ingestEvidence is the guarantee — it
  // covers all thirteen ingest paths — but by the time it fires this route has
  // already stored the original, leaving an orphaned object nobody will ever
  // reference. This early check exists to avoid that write and to answer with
  // a 402 instead of an exception.
  const ceiling = await checkEvidenceLimit(workspaceId);
  if (!ceiling.allowed) {
    return fail(
      `evidence_limit_reached: this workspace holds ${ceiling.used} of ${ceiling.limit} documents included in its plan` +
        (ceiling.requiredPlan ? `. ${ceiling.requiredPlan} raises the ceiling.` : ".") +
        " The file was not stored, so nothing has been lost.",
      402
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = `sha256:${crypto.createHash("sha256").update(buf).digest("hex")}`;
  let storedOriginalUri = parsed.data.sourceUri;

  if (isOriginalStorageEnabled()) {
    try {
      const stored = await storeOriginalFile({
        workspaceId,
        fileName: file.name,
        contentType: uploadContentType,
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
    sourceType,
    department,
    connectorInstanceId: parsed.data.connectorInstanceId,
    sourcePath: parsed.data.sourcePath ?? `/uploads/${file.name}`,
    sourceUri: storedOriginalUri,
    sourceTimestamp: parsed.data.sourceTimestamp ?? new Date().toISOString(),
    hash,
    sensitivity: effectiveSensitivity,
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
      extractedCharCount: extracted.charCount,
      connectorInstanceId: record.connectorInstanceId ?? null,
      sourceType,
      extractionHints: fileCls.extractionHints ?? [],
      evidenceWarnings: fileCls.evidenceWarnings ?? []
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
    connectorInstanceId: record.connectorInstanceId ?? null,
    department: record.department ?? null,
    sourceType: record.sourceType,
    extractionHints: fileCls.extractionHints ?? [],
    evidenceWarnings: fileCls.evidenceWarnings ?? [],
    ingestionStatus: record.ingestionStatus,
    extractionConfidence: record.extractionConfidence
  });
}
