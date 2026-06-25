/**
 * Evidence retrieval + LLM synthesis for the Ask panel.
 *
 * Retrieval strategy (two-tier):
 *
 *   Tier 1 — Vector search (when NEXUS_VECTOR_SEARCH=enabled):
 *     Embeds the query via OpenAI text-embedding-3-small and runs an HNSW
 *     cosine-similarity search against evidence_records.embedding. This path
 *     surfaces semantically related records that keyword matching would miss.
 *     Falls back to Tier 2 if the query embedding fails or no results are found.
 *
 *   Tier 2 — Keyword ranking (always available):
 *     TF-style term matching with a confidence bonus. Used when vector search
 *     is disabled, unavailable, or returns nothing. This was the only path
 *     before migration 0007.
 *
 * After ranking, top candidates go to Claude for executive synthesis.
 * Falls back to a bullet summary when ANTHROPIC_API_KEY is absent (dev / demo).
 */

import type { AskResponse, ConversationMessage, EvidenceRecord, KnowledgeNote } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";
import { generateEmbedding, isVectorSearchEnabled } from "@/lib/services/embeddings";
import { buildCompanyContext } from "@/lib/domain/sector-library";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import { evaluateOutputGate } from "@/lib/agents/output-gate";
import { getPrompt } from "@/lib/prompts/registry";
import { checkOutput } from "@/lib/security/red-team";
import { shouldRouteOutputToReview } from "@/lib/security/ai-policy";

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

/**
 * Attempt vector search first; fall back to keyword ranking.
 * The two-tier approach means semantic retrieval is always additive:
 * turning NEXUS_VECTOR_SEARCH off reverts silently to keyword mode.
 */
async function rankEvidence(
  query: string,
  workspaceId: string,
  options: { department?: string; agentKey?: string } = {}
): Promise<{ records: EvidenceRecord[]; deniedCount: number }> {
  const all = await repository.getEvidenceForWorkspace(workspaceId);
  const processed = all.filter(
    (item) =>
      item.ingestionStatus === "processed" &&
      item.sensitivity !== "restricted" &&
      (!options.department || item.department === options.department)
  );

  let candidates = processed;
  let deniedCount = 0;
  if (options.agentKey) {
    const passport = await repository.getActiveAgentControlProfile(workspaceId, options.agentKey);
    if (!passport) return { records: [], deniedCount: processed.length };
    const governed = filterEvidenceByPassport(processed, passport);
    candidates = governed.allowed;
    deniedCount = governed.denied.length;
    if (governed.denied.length) {
      await Promise.all(
        governed.denied.slice(0, 25).map(({ record, reason }) =>
          repository.pushAudit({
            workspaceId,
            type: "ask_evidence_denied",
            actor: options.agentKey ?? "ask",
            payload: {
              agentKey: options.agentKey,
              evidenceId: record.id,
              sensitivity: record.sensitivity,
              sourceType: record.sourceType,
              department: record.department,
              reason
            }
          })
        )
      );
    }
  }

  if (!candidates.length) return { records: [], deniedCount };

  // --- Tier 1: Vector search -------------------------------------------------
  if (isVectorSearchEnabled()) {
    const queryVec = await generateEmbedding(query);
    if (queryVec) {
      const candidateIds = candidates.map((item) => item.id);
      const vectorResults = await repository.searchEvidenceByVector(workspaceId, queryVec, 6, candidateIds);
      if (vectorResults.length > 0) return { records: vectorResults, deniedCount };
      // No results from vector path (empty workspace or all embeddings NULL) —
      // fall through to keyword ranking rather than returning empty.
    }
  }

  // --- Tier 2: Keyword ranking -----------------------------------------------
  const records = candidates
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
  return { records, deniedCount };
}

// ---------------------------------------------------------------------------
// LLM synthesis
// ---------------------------------------------------------------------------

const ASK_SYSTEM_PROMPT = getPrompt("ask.synthesis");

function buildEvidenceContext(records: EvidenceRecord[]): string {
  return records
    .map(
      (r, i) =>
        `[Evidence ${i + 1}] Source: ${r.sourcePath} | Type: ${r.sourceType} | Age: ${r.freshnessHours}h | Confidence: ${Math.round(r.extractionConfidence * 100)}%\n${r.text}`
    )
    .join("\n\n");
}

function buildNoteContext(notes: KnowledgeNote[]): string {
  return notes
    .map(
      (note, i) =>
        `[Note ${i + 1}] Title: ${note.title} | Path: ${note.path} | Sensitivity: ${note.sensitivity}\n${note.body.slice(0, 1800)}`
    )
    .join("\n\n");
}

function buildConversationContext(history: ConversationMessage[] = []): string {
  const recent = history.slice(-8);
  if (!recent.length) return "";
  return recent
    .map((message) => `${message.role === "user" ? "User" : "NexusAI"}: ${message.text}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export async function answerWithEvidence(
  query: string,
  workspaceId: string,
  options: { department?: string; agentKey?: string; conversationHistory?: ConversationMessage[] } = {}
): Promise<AskResponse> {
  const [ranked, profile, passport] = await Promise.all([
    rankEvidence(query, workspaceId, options),
    repository.getWorkspaceProfile(workspaceId),
    options.agentKey ? repository.getActiveAgentControlProfile(workspaceId, options.agentKey) : Promise.resolve(null)
  ]);
  const results = ranked.records;
  const noteResults = await repository.searchKnowledge(workspaceId, query, 4).catch(() => []);
  const notes = noteResults.map((result) => result.note).filter((note) => note.sensitivity !== "restricted");

  if (options.agentKey && !passport) {
    return {
      answer: "This agent does not have an active Agent Control Profile. Ask cannot run until governance is configured.",
      confidence: 0.1,
      freshnessHours: 9999,
      refused: true,
      refusalReason: "agent_passport_missing",
      evidenceRefs: [],
      noteRefs: [],
      agentKey: options.agentKey
    };
  }

  if (passport && passport.status !== "active") {
    return {
      answer: "This agent is suspended or inactive, so NexusAI refused to retrieve evidence or generate an answer.",
      confidence: 0.1,
      freshnessHours: 9999,
      refused: true,
      refusalReason: "agent_not_active",
      evidenceRefs: [],
      noteRefs: [],
      agentKey: options.agentKey
    };
  }

  if (!results.length && ranked.deniedCount > 0) {
    return {
      answer: "Relevant evidence exists, but this agent is not allowed to access it under its Agent Control Profile.",
      confidence: 0.1,
      freshnessHours: 9999,
      refused: true,
      refusalReason: "passport_denied_evidence",
      evidenceRefs: [],
      noteRefs: notes.map((note) => note.id),
      agentKey: options.agentKey
    };
  }

  if (!results.length && !notes.length) {
    return {
      answer:
        options.department
          ? `No relevant evidence found for ${options.department}. Upload source documents for that department and ensure they pass ingestion before asking.`
          : "No relevant evidence found in this workspace for that query. Upload source documents and ensure they pass ingestion before asking.",
      confidence: 0.1,
      freshnessHours: 9999,
      refused: true,
      refusalReason: "insufficient_evidence",
      evidenceRefs: [],
      noteRefs: [],
      agentKey: options.agentKey
    };
  }

  const avgConfidence = Number(
    (results.length ? results.reduce((s, r) => s + r.extractionConfidence, 0) / results.length : 0.72).toFixed(2)
  );
  const minFreshness = results.length ? Math.min(...results.map((r) => r.freshnessHours)) : 0;

  if (results.length && avgConfidence < 0.55) {
    return {
      answer:
        "Evidence quality is currently too weak for a reliable executive answer. Please review quarantined documents in the Ingestion queue.",
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: true,
      refusalReason: "low_confidence_evidence",
      evidenceRefs: results.map((r) => r.id),
      noteRefs: notes.map((note) => note.id),
      agentKey: options.agentKey
    };
  }

  const context = buildEvidenceContext(results);
  const noteContext = buildNoteContext(notes);
  const conversationContext = buildConversationContext(options.conversationHistory);
  const companyContext = profile ? buildCompanyContext(profile) : "";
  const contextPrefix = companyContext ? `${companyContext}\n\n` : "";
  const historyPrefix = conversationContext
    ? `Recent conversation:\n${conversationContext}\n\nUse this only to interpret follow-up wording. Evidence remains the source of truth.\n\n`
    : "";
  const evidenceSection = context ? `Evidence:\n\n${context}\n\n` : "";
  const noteSection = noteContext ? `Knowledge notes:\n\n${noteContext}\n\n` : "";
  const userPrompt = `${contextPrefix}${historyPrefix}${evidenceSection}${noteSection}Question: ${query}`;

  try {
    const answer = await ask(userPrompt, ASK_SYSTEM_PROMPT, {
      maxTokens: 512,
      temperature: 0.15,
      workspaceId
    });

    const gate = passport ? evaluateOutputGate(answer, passport, passport.actionRight) : { allowed: true as const, escalationRequired: false as const };
    if (!gate.allowed) {
      await repository.pushAudit({
        workspaceId,
        type: "ask_output_blocked",
        actor: options.agentKey ?? "ask",
        payload: { agentKey: options.agentKey, reason: gate.reason, query }
      });
      if (options.agentKey) {
        await repository.suspendAgentControlProfile(workspaceId, options.agentKey, "output_gate");
      }
      return {
        answer: "NexusAI blocked this answer because it appears to request or imply a hard-stop action that requires human handling.",
        confidence: avgConfidence,
        freshnessHours: minFreshness,
        refused: true,
        refusalReason: gate.reason,
        evidenceRefs: results.map((r) => r.id),
        noteRefs: notes.map((note) => note.id),
        agentKey: options.agentKey,
        escalationRequired: true,
        escalationReason: gate.reason
      };
    }
    if (gate.escalationRequired) {
      await repository.pushAudit({
        workspaceId,
        type: "ask_output_escalated",
        actor: options.agentKey ?? "ask",
        payload: { agentKey: options.agentKey, reason: gate.reason, query }
      });
    }

    const redTeam = checkOutput(answer, {
      workspaceId,
      agentId: options.agentKey ?? "ask",
      maxSensitivity: passport?.maxSensitivity ?? "confidential",
      outputSensitivity: results.some((item) => item.sensitivity === "confidential") ? "confidential" : "internal",
      humanReviewGate: gate.escalationRequired
    });
    if (!redTeam.passed) {
      await repository.pushAudit({
        workspaceId,
        type: "red_team_violation",
        actor: options.agentKey ?? "ask",
        payload: { route: "ask", violations: redTeam.violations, query }
      });
      return {
        answer: "NexusAI blocked this answer because the safety review detected sensitive data, overconfident language, or an unsafe action. Please narrow the question or request a human-reviewed brief.",
        confidence: avgConfidence,
        freshnessHours: minFreshness,
        refused: true,
        refusalReason: "red_team_violation",
        evidenceRefs: results.map((r) => r.id),
        noteRefs: notes.map((note) => note.id),
        agentKey: options.agentKey,
        escalationRequired: true,
        escalationReason: "red_team_violation"
      };
    }

    const settings = await repository.getWorkspaceSettings(workspaceId);
    if (shouldRouteOutputToReview(settings, avgConfidence)) {
      await repository.pushAudit({
        workspaceId,
        type: "ask_output_review_required",
        actor: options.agentKey ?? "ask",
        payload: {
          agentKey: options.agentKey,
          confidence: avgConfidence,
          threshold: settings.approvalRequiredThreshold,
          query
        }
      });
      return {
        answer: "NexusAI generated an answer, but the evidence confidence is below this workspace's human-review threshold. Review the source evidence before using this answer.",
        confidence: avgConfidence,
        freshnessHours: minFreshness,
        refused: true,
        refusalReason: "approval_threshold",
        evidenceRefs: results.map((r) => r.id),
        noteRefs: notes.map((note) => note.id),
        agentKey: options.agentKey,
        escalationRequired: true,
        escalationReason: "approval_threshold"
      };
    }

    return {
      answer,
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: false,
      evidenceRefs: results.map((r) => r.id),
      noteRefs: notes.map((note) => note.id),
      agentKey: options.agentKey,
      escalationRequired: gate.escalationRequired,
      escalationReason: gate.escalationRequired ? gate.reason : undefined
    };
  } catch {
    // LLM call failed - fallback to bullet summary so the app still works
    const fallback = [
      ...results.map((r) => `- ${r.text}`),
      ...notes.map((note) => `- ${note.title}: ${note.body.slice(0, 260)}`)
    ].join("\n");
    return {
      answer: `Evidence summary (AI synthesis unavailable):\n${fallback}`,
      confidence: avgConfidence,
      freshnessHours: minFreshness,
      refused: false,
      evidenceRefs: results.map((r) => r.id),
      noteRefs: notes.map((note) => note.id),
      agentKey: options.agentKey
    };
  }
}
