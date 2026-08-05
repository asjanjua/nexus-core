import crypto from "crypto";
import type { EvidenceRecord, EvidenceSourceType, IngestionStatus } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { generateEmbedding, isVectorSearchEnabled } from "@/lib/services/embeddings";
import { extractAndStoreEntitiesForEvidence } from "@/lib/services/entity-extraction";
import { captureHandledError } from "@/lib/observability/sentry";
import { checkEvidenceLimit } from "@/lib/billing/budget";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB hard cap

/**
 * Upload types the extractor understands (see lib/services/extract.ts), mapped
 * to the content type the stored original is served with.
 *
 * This map is authoritative for two reasons. The browser `accept` attribute is
 * only a hint and any client can post past it. And a client-supplied content
 * type must never decide how a stored original is later served back, or an
 * uploaded text/html file becomes stored XSS on the app origin.
 */
const ALLOWED_UPLOAD_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

/**
 * Server-derived content type for an upload, or null if the extension is not
 * on the allowlist. Callers must treat null as a rejected upload.
 */
export function contentTypeForUpload(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  return ALLOWED_UPLOAD_CONTENT_TYPES[fileName.slice(dot).toLowerCase()] ?? null;
}

type IngestionInput = {
  workspaceId: string;
  tenantId: string;
  sourceType: EvidenceSourceType;
  department?: string;
  connectorInstanceId?: string;
  sourcePath: string;
  sourceUri?: string;
  sourceTimestamp: string;
  hash: string;
  sensitivity: EvidenceRecord["sensitivity"];
  extractionConfidence: number;
  text: string;
};

type IngestionThresholds = {
  quarantineThreshold: number;
  processedThreshold: number;
};

const DEFAULT_THRESHOLDS: IngestionThresholds = {
  quarantineThreshold: 0.35,
  processedThreshold: 0.75
};

/**
 * Three-tier confidence routing:
 *
 *   < quarantineThreshold  → quarantined      (very low quality — blocked, needs re-upload)
 *   quarantineThreshold–0.75 → pending_approval (moderate — staged for human sign-off before LLM synthesis)
 *   > 0.75  → processed        (high confidence — auto-cleared for synthesis)
 *
 * Missing provenance (no hash or timestamp) always quarantines regardless of confidence.
 * Workspace settings currently tune the lower quarantine floor; the auto-clear
 * floor remains fixed at 0.75 for V1.
 */
export function deriveIngestionStatus(
  extractionConfidence: number,
  hasProvenance: boolean,
  thresholds: IngestionThresholds = DEFAULT_THRESHOLDS
): IngestionStatus {
  const quarantineThreshold = Math.min(
    Math.max(thresholds.quarantineThreshold, 0),
    thresholds.processedThreshold
  );
  if (!hasProvenance) return "quarantined";
  if (extractionConfidence < quarantineThreshold) return "quarantined";
  if (extractionConfidence <= thresholds.processedThreshold) return "pending_approval";
  return "processed";
}

/**
 * Compute how many hours old a source timestamp is as of now.
 * Calculated at ingest time so dashboards reflect real document age.
 */
export function computeFreshnessHours(sourceTimestamp: string): number {
  const source = new Date(sourceTimestamp).getTime();
  if (isNaN(source)) return 9999;
  const diffMs = Date.now() - source;
  return Math.max(0, Math.floor(diffMs / 3_600_000));
}

/**
 * Raised when a workspace is already at the evidence ceiling its plan sells.
 *
 * A typed error rather than a null return, because every one of the thirteen
 * call sites currently assumes `ingestEvidence` either produces a record or
 * throws. Returning null would compile and then be ignored, and evidence would
 * silently vanish — the worst possible outcome for a product whose entire
 * claim is that nothing goes missing.
 */
export class EvidenceLimitReachedError extends Error {
  readonly used: number;
  readonly limit: number;
  readonly requiredPlan?: string;

  constructor(result: { used: number; limit: number; requiredPlan?: string }) {
    super(
      `Evidence limit reached: ${result.used} of ${result.limit} on the current plan` +
        (result.requiredPlan ? `. ${result.requiredPlan} raises this ceiling.` : ".")
    );
    this.name = "EvidenceLimitReachedError";
    this.used = result.used;
    this.limit = result.limit;
    this.requiredPlan = result.requiredPlan;
  }
}

export async function ingestEvidence(input: IngestionInput): Promise<EvidenceRecord> {
  // ENFORCED HERE, NOT IN THE ROUTES. Thirteen call sites reach this function,
  // and a check copied into each of them is a check that will be missing from
  // the fourteenth. The same reasoning produced matchesEvidenceTags after four
  // engines independently wrote the same wrong comparison.
  //
  // BEFORE the record is built, so a rejected ingest leaves nothing behind: no
  // half-written row, no embedding job, no audit entry implying it worked.
  //
  // REFUSED RATHER THAN TRUNCATED. The caller still holds the file, so a clear
  // refusal costs them a retry after upgrading; accepting and dropping would
  // cost them evidence they believe is in the system. checkEvidenceLimit fails
  // OPEN on error, so a billing outage degrades to letting work through rather
  // than blocking a paying customer's pilot.
  const limit = await checkEvidenceLimit(input.workspaceId);
  if (!limit.allowed) throw new EvidenceLimitReachedError(limit);

  const hasProvenance = Boolean(
    input.sourcePath && input.hash && input.sourceTimestamp
  );
  const workspaceSettings = await repository.getWorkspaceSettings(input.workspaceId);
  const ingestionStatus = deriveIngestionStatus(
    input.extractionConfidence,
    hasProvenance,
    {
      quarantineThreshold: workspaceSettings.quarantineThreshold,
      processedThreshold: DEFAULT_THRESHOLDS.processedThreshold
    }
  );

  const record: EvidenceRecord = {
    id: `ev-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    sourceType: input.sourceType,
    department: input.department,
    connectorInstanceId: input.connectorInstanceId,
    sourcePath: input.sourcePath,
    sourceUri: input.sourceUri,
    sourceTimestamp: input.sourceTimestamp,
    ingestedAt: new Date().toISOString(),
    hash: input.hash,
    sensitivity: input.sensitivity,
    extractionConfidence: Number(input.extractionConfidence.toFixed(2)),
    ingestionStatus,
    freshnessHours: computeFreshnessHours(input.sourceTimestamp),
    text: input.text
  };

  const saved = await repository.addEvidenceRecord(record);

  // Async embedding generation — fire-and-forget.
  // Only runs when NEXUS_VECTOR_SEARCH=enabled and OPENAI_API_KEY is set.
  // Failure here never blocks ingest; the record is already committed.
  if (isVectorSearchEnabled()) {
    void (async () => {
      const embedding = await generateEmbedding(input.text);
      if (!embedding) return;
      await repository.storeEmbedding(saved.id, embedding);
    })().catch((error) => {
      captureHandledError(error, {
        route: "lib/services/ingestion",
        errorType: "embedding_store_failed",
        workspaceId: saved.workspaceId,
        extra: { evidenceId: saved.id },
      });
    });
  }

  if (saved.ingestionStatus === "processed") {
    void extractAndStoreEntitiesForEvidence(saved).catch((error) => {
      captureHandledError(error, {
        route: "lib/services/ingestion",
        errorType: "entity_extraction_failed",
        workspaceId: saved.workspaceId,
        extra: { evidenceId: saved.id },
      });
    });
  }

  return saved;
}
