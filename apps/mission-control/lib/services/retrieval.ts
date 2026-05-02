/**
 * Evidence retrieval + LLM synthesis for the Ask panel.
 *
 * Flow:
 *   1. Keyword-rank processed, non-restricted evidence records.
 *   2. Pass top candidates to Claude for executive synthesis.
 *   3. Return a governed AskResponse with evidence refs, confidence, freshness.
 *
 * Falls back to bullet summary when ANTHROPIC_API_KEY is absent (dev / demo).
 */

import type { AskResponse, EvidenceRecord } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";

// ---------------------------------------------------------------------------
// Keyword ranking (pre-filter before LLM call)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "is", "a", "an", "and", "or", "to", "of", "what", "are",
  "right", "now", "in", "on", "at", "for", "with", "from", "by", "do"
]);

const RISK_SIGNALS = [
  "risk", "margin", "delay", "blocker", "failure", "issue",
  "compression", "overdue", "blocked", "escalat"
];

function keywordScore(query: string, text: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t && !STOPWORDS.has(t));
  if (!terms.length) return 0;

  const hay = text.toLowerCase();
  let matches = 0;
  for (const term of terms) {
    if (hay.includes(term)) {
      matches++;
    } else if (
      (term === "risk" || term === "risks") &&
      RISK_SIGNALS.some((s) => hay.includes(s))
    ) {
      matches++;
    }
  }
  return matches / terms.length;
}

async function rankEvidence(query: string, workspaceId: string): Promise<EvidenceRecord[]> {
  const all = await repository.getEvidenceForWorkspace(workspaceId);
  return all
    .filter(
      (item) =>
        item.ingestionStatus === "processed" &&
        item.sensitivity !== "restricted"
    )
    .map((item) => {
      const ks = keywordScore(query, item.text);
      return { item, ks, score: ks + item.extractionConfidence * 0.25 };
    })
    // ks > 0 is a hard gate: confidence bonus alone must not qualify a record.
    // This ensures queries with no keyword overlap return refused=true.
    .filter((r) => r.ks > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => r.item);
}

// ---------------------------------------------------------------------------
// LLM synthesis
// ---------------------------------------------------------------------------

const ASK_SYSTEM_PROMPT = `You are a senior executive intelligence analyst embedded in NexusAI Mission Control.
Your job is to answer executive questions concisely and precisely, grounded only in the evidence provided.

Rules:
- Answer in 3-5 sentences unless the question demands more detail.
- Reference specific facts from the evidence. Do not speculate beyond what is in the evidence.
- If the evidence is insufficient, say so explicitly and explain what is missing.
- Use professional, executive-ready language. No bullet points unless listing distinct items.
- End with a confidence note: e.g. "Evidence confidence: 84%."`;

function buildEvidenceContext(records: EvidenceRecord[]): string {
  return records
    .map(
      (r, i) =>
        `[Evidence ${i + 1}] Source: ${r.sourcePath} | Type: ${r.sourceType} | Age: ${r.freshnessHours}h | Confidence: ${Math.round(r.extractionConfidence * 100)}%\n${r.text}`
    )
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export async function answerWithEvidence(
  query: string,
  workspaceId: string
): Promise<AskResponse> {
  const results = await rankEvidence(query, workspaceId);

  if (!results.length) {
    return {
      answer:
        "No relevant evidence found in this workspace for that query. Upload source documents and ensure they pass ingestion before asking.",
      confidence: 0.1,
      freshnessHours: 9999,
      refused: true,
      refusalReason: "insufficient_evidence",
      evidenceRefs: []
    };
  }

  const avgConfidence = Number(
    (results.reduce((s, r) => s + r.extractionConfidence, 0) / results.length).toFixed(2)
  );
  const minFreshness = Math.min(...results.map((r) => r.freshnessHours));

  if (avgConfidence < 0.55) {
    return {
      answer:
        "Evidence quality is currently too weak for a reliable executive answer. Please review quarantined documents in the Ingestion queue.",
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: true,
      refusalReason: "low_confidence_evidence",
      evidenceRefs: results.map((r) => r.id)
    };
  }

  const context = buildEvidenceContext(results);
  const userPrompt = `Evidence:\n\n${context}\n\nQuestion: ${query}`;

  try {
    const answer = await ask(userPrompt, ASK_SYSTEM_PROMPT, {
      maxTokens: 512,
      temperature: 0.15
    });

    return {
      answer,
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: false,
      evidenceRefs: results.map((r) => r.id)
    };
  } catch {
    // LLM call failed - fallback to bullet summary so the app still works
    const fallback = results.map((r) => `- ${r.text}`).join("\n");
    return {
      answer: `Evidence summary (AI synthesis unavailable):\n${fallback}`,
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: false,
      evidenceRefs: results.map((r) => r.id)
    };
  }
}
