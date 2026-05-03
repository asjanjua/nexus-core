import crypto from "crypto";
import type { EvidenceRecord, IngestionStatus } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { generateEmbedding, isVectorSearchEnabled } from "@/lib/services/embeddings";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB hard cap

type IngestionInput = {
  workspaceId: string;
  tenantId: string;
  sourceType: string;
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

export async function ingestEvidence(input: IngestionInput): Promise<EvidenceRecord> {
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
    void generateEmbedding(input.text).then((embedding) => {
      if (embedding) {
        void repository.storeEmbedding(saved.id, embedding);
      }
    });
  }

  return saved;
}
