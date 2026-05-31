/**
 * LLM-powered recommendation generation service.
 *
 * Fetches processed evidence for a workspace, prompts the LLM to produce
 * 2-3 structured recommendations as JSON, then persists them via the
 * repository. Designed to be called fire-and-forget after ingestion.
 *
 * Safeguards:
 *  - Skips generation when no processed evidence exists.
 *  - Caps draft recommendations at 10 to prevent runaway generation.
 *  - Deduplicates by title (case-insensitive) against existing records.
 *  - Fails silently on LLM or parse errors — never throws to the caller.
 */

import crypto from "crypto";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";
import { buildCompanyContext } from "@/lib/domain/sector-library";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const RECO_SYSTEM_PROMPT = `You are an executive strategy advisor for NexusAI Mission Control.
Analyse the evidence and produce 2-3 specific, actionable recommendations for the leadership team.

Respond ONLY with a valid JSON array. No markdown code fences, no explanation outside the array.

Required format:
[
  {
    "title": "Short imperative recommendation (8-12 words)",
    "owner": "Role title (CEO / CTO / COO / CFO / CMO / etc.)",
    "confidence": 0.75,
    "affectedEntityIds": ["engineering", "product"],
    "evidenceRefs": ["<exact evidence ID from the list>"]
  }
]

Rules:
- title: imperative verb phrase, specific and actionable, 8-12 words max.
- owner: single executive role title responsible for driving this.
- confidence: float 0.0–1.0 reflecting evidence strength. Use <0.5 for thin evidence.
- affectedEntityIds: functional areas impacted (e.g. "finance", "sales", "operations").
- evidenceRefs: only IDs explicitly provided in the evidence list. Never invent IDs.
- Do not invent facts. Ground every recommendation in the evidence.`;

// ---------------------------------------------------------------------------
// Evidence formatter
// ---------------------------------------------------------------------------

function buildEvidenceBlock(
  records: Array<{ id: string; sourcePath: string; sourceType: string; extractionConfidence: number; text: string }>
): string {
  return records
    .map(
      (r) =>
        `ID: ${r.id}\nSource: ${r.sourcePath} (${r.sourceType}) | confidence ${Math.round(r.extractionConfidence * 100)}%\n${r.text.slice(0, 600)}`
    )
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateRecommendations(workspaceId: string): Promise<void> {
  try {
    const [allEvidence, profile] = await Promise.all([
      repository.getEvidenceForWorkspace(workspaceId),
      repository.getWorkspaceProfile(workspaceId)
    ]);

    const processed = allEvidence.filter(
      (r) => r.ingestionStatus === "processed" && r.sensitivity !== "restricted"
    );

    if (!processed.length) return;

    // Cap: avoid runaway generation if many drafts already exist
    const existing = await repository.getRecommendations(workspaceId);
    const draftCount = existing.filter((r) => r.status === "draft").length;
    if (draftCount >= 10) return;

    const evidenceBlock = buildEvidenceBlock(processed);
    const companyContext = profile ? buildCompanyContext(profile) : "";
    const contextPrefix = companyContext ? `${companyContext}\n\n` : "";
    const userPrompt = `${contextPrefix}Evidence:\n\n${evidenceBlock}\n\nGenerate 2-3 recommendations.`;

    let raw: string;
    try {
      raw = await ask(userPrompt, RECO_SYSTEM_PROMPT, { maxTokens: 600, temperature: 0.2, workspaceId });
    } catch {
      return; // LLM unavailable — fail silently
    }

    if (!raw || !raw.trim()) return;

    // Strip markdown code fences the model sometimes adds
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: Array<{
      title: string;
      owner: string;
      confidence: number;
      affectedEntityIds: string[];
      evidenceRefs: string[];
    }>;

    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return;
    } catch {
      return; // Malformed JSON — fail silently
    }

    const existingTitles = new Set(existing.map((r) => r.title.toLowerCase()));
    const processedIds = new Set(processed.map((e) => e.id));

    for (const item of parsed.slice(0, 3)) {
      if (!item?.title) continue;
      if (existingTitles.has(item.title.toLowerCase())) continue;

      const id = `rec-${crypto.randomUUID()}`;
      const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0.5));
      const affectedEntityIds = Array.isArray(item.affectedEntityIds) ? item.affectedEntityIds : [];
      // Only keep evidence refs that actually exist in this workspace
      const evidenceRefs = Array.isArray(item.evidenceRefs)
        ? item.evidenceRefs.filter((ref: string) => processedIds.has(ref))
        : [];

      await repository.addRecommendation({
        id,
        tenantId: workspaceId.replace(/^(?!tenant-)/, "tenant-").replace("workspace-", "tenant-"),
        workspaceId,
        title: item.title,
        owner: typeof item.owner === "string" && item.owner ? item.owner : "Unassigned",
        status: "draft",
        confidence,
        affectedEntityIds,
        evidenceRefs,
      });

      existingTitles.add(item.title.toLowerCase()); // prevent intra-batch duplicates
    }
  } catch {
    // Never propagate — caller uses fire-and-forget
  }
}
