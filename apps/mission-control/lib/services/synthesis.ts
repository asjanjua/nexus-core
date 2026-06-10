/**
 * Executive Synthesis Layer
 *
 * Dispatches specialist agent cards for a role, then synthesises one
 * evidence-backed leadership brief that answers the questions executives
 * actually ask at the start of their day.
 *
 * No new tables. Synthesis is computed on demand from existing agent outputs
 * and evidence. Agent cards remain accessible as drill-down detail.
 */

import type { Entity, EvidenceRecord, ExecutiveSynthesis, ExecutiveSynthesisQuestion } from "@/lib/contracts";
import { cardsForRole } from "@/lib/services/dashboard";
import { ask } from "@/lib/services/llm";
import { briefLanguageInstruction, buildCompanyContext } from "@/lib/domain/sector-library";
import { repository } from "@/lib/data/repository";
import { checkOutput } from "@/lib/security/red-team";
import { getPrompt } from "@/lib/prompts/registry";

type DashboardCards = Awaited<ReturnType<typeof cardsForRole>>;

type SynthesisSource = ExecutiveSynthesisQuestion["sources"][number];
type SynthesisEntity = ExecutiveSynthesisQuestion["entities"][number];

// ---------------------------------------------------------------------------
// Role question sets
// ---------------------------------------------------------------------------

const CEO_QUESTIONS = [
  "What is the single most important thing I need to know today?",
  "What is the biggest risk to our plan, and what is being done about it?",
  "What decision needs my attention before the end of this week?",
  "What is our execution health — are the right things moving?",
  "What does the evidence say about our commercial position?",
  "Where are the people or capability gaps that could block us?",
  "What should I say to the board or investors if asked today?",
];

const COO_QUESTIONS = [
  "What is blocked and who owns it?",
  "What process or vendor is at risk of failing us?",
  "What are the top 3 execution priorities this week?",
  "What does the capacity or headcount picture look like?",
  "What would I escalate to the CEO today?",
];

const CFO_QUESTIONS = [
  "What is the current cash and margin position?",
  "Where are we tracking behind forecast, and by how much?",
  "What financial risk needs immediate attention?",
  "What approvals or commitments are pending?",
  "What does the revenue quality look like this quarter?",
];

const CTO_QUESTIONS = [
  "What is the health of our technology and data stack?",
  "What security or compliance issue needs attention?",
  "What architectural decision is pending?",
  "Where is AI or data quality degrading our outputs?",
  "What should engineering prioritise this sprint?",
];

const CBO_QUESTIONS = [
  "What is the state of our commercial pipeline?",
  "What market signal should we act on?",
  "What is the top partnership or proposal at risk?",
  "What does competitive movement look like?",
  "What should I do to close or advance our biggest opportunity?",
];

const CHRO_QUESTIONS = [
  "What is the hiring or attrition situation this month?",
  "What culture or engagement signal needs attention?",
  "Who is at risk of leaving and what is the exposure?",
  "What L&D or capability gap is costing us?",
  "What people issue should I escalate to the CEO?",
];

const GENERIC_QUESTIONS = [
  "What is the most important update from your domain today?",
  "What risk or issue needs immediate attention?",
  "What decision is pending that requires your input?",
  "What does the evidence say about your team's priorities?",
  "What would you escalate upward today?",
];

const ROLE_QUESTIONS: Record<string, string[]> = {
  ceo: CEO_QUESTIONS,
  coo: COO_QUESTIONS,
  cfo: CFO_QUESTIONS,
  cto: CTO_QUESTIONS,
  cdo: CTO_QUESTIONS,
  cbo: CBO_QUESTIONS,
  cmo: CBO_QUESTIONS,
  chro: CHRO_QUESTIONS,
};

export function questionsForRole(role: string): string[] {
  return ROLE_QUESTIONS[role] ?? GENERIC_QUESTIONS;
}

// ---------------------------------------------------------------------------
// Synthesis system prompt
// ---------------------------------------------------------------------------

const SYNTHESIS_SYSTEM_PROMPT = getPrompt("synthesis.executive");

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function sourcesForEvidence(evidence: EvidenceRecord[], evidenceRefs: string[]): SynthesisSource[] {
  const wanted = new Set(evidenceRefs);
  return evidence
    .filter((record) => wanted.has(record.id))
    .slice(0, 6)
    .map((record) => ({
      id: record.id,
      label: fileName(record.sourcePath),
      sourceType: record.sourceType,
      department: record.department,
      confidence: record.extractionConfidence,
    }));
}

function entitiesForEvidence(entities: Entity[], evidenceRefs: string[]): SynthesisEntity[] {
  const wanted = new Set(evidenceRefs);
  return entities
    .filter((entity) => entity.evidenceRefs.some((ref) => wanted.has(ref)))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      confidence: entity.confidence,
    }));
}

// ---------------------------------------------------------------------------
// Per-question answer generation
// ---------------------------------------------------------------------------

async function answerQuestion(
  question: string,
  agentBriefBlock: string,
  companyContext: string,
  languageInstruction: string,
  evidenceRefs: string[],
  sources: SynthesisSource[],
  entities: SynthesisEntity[],
  workspaceId: string
): Promise<ExecutiveSynthesisQuestion> {
  const contextPrefix = companyContext ? `${companyContext}\n\n` : "";
  const prompt = `${contextPrefix}${languageInstruction ? `Language rule: ${languageInstruction}\n\n` : ""}Specialist agent briefs:\n\n${agentBriefBlock}\n\nQuestion: ${question}`;

  let answer: string;
  const startedAt = Date.now();

  try {
    answer = await ask(prompt, SYNTHESIS_SYSTEM_PROMPT, {
      maxTokens: 200,
      temperature: 0.1,
      workspaceId,
    });
  } catch {
    answer = "Synthesis unavailable — verify AI provider credentials in your Render environment.";
  }

  // Red-team check on each answer
  const redTeam = checkOutput(answer, { roleKey: "synthesis", workspaceId, maxSensitivity: "confidential" });
  if (!redTeam.passed) {
    void repository.pushAudit({
      workspaceId,
      type: "red_team_violation",
      actor: "synthesis_service",
      payload: { question, violations: redTeam.violations, processingMs: Date.now() - startedAt }
    });
    answer = "NexusAI blocked this synthesis answer because the safety review detected sensitive data, overconfident language, or an unsafe action.";
  }

  // Confidence: derive from average of agent card confidence
  const confidence = 0.75; // baseline; overridden per-question in aggregation

  return {
    question,
    answer,
    confidence,
    evidenceRefs,
    sources,
    entities,
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher — public interface
// ---------------------------------------------------------------------------

export async function synthesiseForRole(
  role: string,
  workspaceId = process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo",
  options: { department?: string; cards?: DashboardCards } = {}
): Promise<ExecutiveSynthesis> {
  // 1. Dispatch: collect all specialist agent cards for this role
  const cards = options.cards ?? await cardsForRole(role, workspaceId, { department: options.department });

  // 2. Build compound agent brief block
  const agentBriefBlock = cards
    .map(
      (card) =>
        `[${card.agentName ?? card.title}] ${card.mandate ?? ""}\n${card.summary}`
    )
    .join("\n\n---\n\n");

  // 3. Collect all unique evidence refs across all cards
  const allEvidenceRefs = Array.from(
    new Set(cards.flatMap((card) => card.evidenceRefs))
  );

  // 4. Compute overall confidence from agent cards
  const overallConfidence =
    cards.length > 0
      ? Number(
          (
            cards.reduce((sum, card) => sum + card.confidence, 0) / cards.length
          ).toFixed(2)
        )
      : 0;

  // 5. Build company context strings
  const profile = await repository.getWorkspaceProfile(workspaceId).catch(() => null);
  const companyContext = profile ? buildCompanyContext(profile) : "";
  const languageInstruction = profile
    ? briefLanguageInstruction(profile.briefLanguageMode, profile.companyArchetype)
    : "";

  // 6. Get role-specific questions
  const questions = questionsForRole(role);

  // 6.5 Add source names and entity backlinks for the brief UI.
  const [evidence, entities] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.listEntities(workspaceId, { limit: 100 }).catch(() => []),
  ]);
  const sources = sourcesForEvidence(evidence, allEvidenceRefs);
  const linkedEntities = entitiesForEvidence(entities, allEvidenceRefs);

  // 7. Answer each question (parallel for speed)
  const answeredQuestions = await Promise.all(
    questions.map((question) =>
      answerQuestion(
        question,
        agentBriefBlock,
        companyContext,
        languageInstruction,
        allEvidenceRefs,
        sources,
        linkedEntities,
        workspaceId
      ).then((q) => ({
        ...q,
        confidence: overallConfidence,
      }))
    )
  );

  return {
    role,
    workspaceId,
    generatedAt: new Date().toISOString(),
    questions: answeredQuestions,
    overallConfidence,
    totalEvidenceRefs: allEvidenceRefs,
    agentCardCount: cards.length,
  };
}
