import crypto from "crypto";
import type { EvidenceRecord, IngestionStatus } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

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

/**
 * Three-tier confidence routing:
 *
 *   < 0.35  → quarantined      (very low quality — blocked, needs re-upload)
 *   0.35–0.75 → pending_approval (moderate — staged for human sign-off before LLM synthesis)
 *   > 0.75  → processed        (high confidence — auto-cleared for synthesis)
 *
 * Missing provenance (no hash or timestamp) always quarantines regardless of confidence.
 */
export function deriveIngestionStatus(
  extractionConfidence: number,
  hasProvenance: boolean
): IngestionStatus {
  if (!hasProvenance) return "quarantined";
  if (extractionConfidence < 0.35) return "quarantined";
  if (extractionConfidence <= 0.75) return "pending_approval";
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
  const ingestionStatus = deriveIngestionStatus(
    input.extractionConfidence,
    hasProvenance
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

  return repository.addEvidenceRecord(record);
}
