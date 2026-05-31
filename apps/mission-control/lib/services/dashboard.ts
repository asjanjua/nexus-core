/**
 * Specialist-agent brief generation.
 *
 * Each room gets a set of named specialist agents that synthesize
 * evidence-backed briefs from the same governed evidence base.
 * Falls back to statistical summary when LLM is unavailable.
 */

import type { DashboardCard, EvidenceRecord, Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";
import { briefLanguageInstruction, buildCompanyContext } from "@/lib/domain/sector-library";
import { agentBriefIdsForRoleContext, agentForId, AGENT_ROOMS, roomForRole, type NexusAgent } from "@/lib/agents/agent-library";

// ---------------------------------------------------------------------------
// Agent prompt configuration
// ---------------------------------------------------------------------------

const DASHBOARD_SYSTEM_PROMPT = `You are an executive intelligence analyst for NexusAI Mission Control.
Your role is to operate as a specialist business agent and synthesize evidence into concise, actionable Agent Briefs.

Rules:
- Write 2-4 sentences maximum per card.
- Be specific. Reference facts from the evidence directly. Do not invent information.
- Use executive language: clear, direct, no jargon.
- If the company context says "Plain brief mode", use 2-3 short plain-English sentences and one clear action. Do not use corporate finance jargon.
- If evidence is insufficient for a card topic, say: "Insufficient evidence - [what is missing]."
- Stay inside the agent mandate and approval policy.
- Do not add generic advice or best practices not grounded in the evidence.`;

// ---------------------------------------------------------------------------
// Evidence preparation
// ---------------------------------------------------------------------------

function buildEvidenceBlock(records: EvidenceRecord[]): string {
  if (!records.length) return "No processed evidence available.";
  return records
    .map(
      (r) =>
        `Source: ${r.sourcePath} | ${r.sourceType} | ${r.freshnessHours}h old | conf ${Math.round(r.extractionConfidence * 100)}%\n${r.text}`
    )
    .join("\n\n");
}

function computeAvgConfidence(records: EvidenceRecord[]): number {
  if (!records.length) return 0;
  return Number(
    (records.reduce((s, r) => s + r.extractionConfidence, 0) / records.length).toFixed(2)
  );
}

function computeMinFreshness(records: EvidenceRecord[]): number {
  if (!records.length) return 9999;
  return Math.min(...records.map((r) => r.freshnessHours));
}

// ---------------------------------------------------------------------------
// Card generation
// ---------------------------------------------------------------------------

async function generateCard(
  agent: NexusAgent,
  role: Role,
  evidenceBlock: string,
  evidenceRefs: string[],
  avgConfidence: number,
  minFreshness: number,
  companyContext = "",
  languageInstruction = "",
  workspaceId = "_global_"
): Promise<DashboardCard> {
  const room = AGENT_ROOMS.find((item) => item.id === agent.room) ?? roomForRole(role);
  const contextPrefix = companyContext ? `${companyContext}\n\n` : "";
  const userPrompt = `${contextPrefix}Agent: ${agent.name}
Room: ${room.label}
Mandate: ${agent.mandate}
Output type: ${agent.outputType}
Approval policy: ${agent.approvalPolicy}
Evidence scope hints: ${agent.evidenceScope.join(", ")}
Language rule: ${languageInstruction || "Use concise executive language appropriate to the company context."}

Evidence:

${evidenceBlock}

Task: Produce this agent's brief using only the evidence above. Include what changed, why it matters, and the most useful next action if the evidence supports one.`;

  let summary: string;
  try {
    summary = await ask(userPrompt, DASHBOARD_SYSTEM_PROMPT, {
      maxTokens: 256,
      temperature: 0.1,
      workspaceId
    });
  } catch {
    summary = `Evidence count: ${evidenceRefs.length}. AI synthesis unavailable — verify DEEPSEEK_API_KEY (or ANTHROPIC_API_KEY) is set in your Render environment.`;
  }

  return {
    id: `${role}-${agent.id}`,
    role,
    agentId: agent.id,
    agentName: agent.name,
    agentRoom: agent.room,
    agentRoomLabel: room.label,
    mandate: agent.mandate,
    outputType: agent.outputType,
    approvalPolicy: agent.approvalPolicy,
    skillHints: agent.skillHints,
    suggestedNextAction: agent.suggestedNextAction,
    lastRunAt: new Date().toISOString(),
    title: `${agent.name} Brief`,
    summary,
    confidence: avgConfidence,
    freshnessHours: minFreshness,
    evidenceRefs
  };
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export async function cardsForRole(
  role: Role,
  workspaceId = process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo",
  options: { department?: string; agentId?: string } = {}
): Promise<DashboardCard[]> {
  const [allEvidence, profile] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getWorkspaceProfile(workspaceId)
  ]);

  const processedEvidence = allEvidence.filter(
    (r) =>
      r.ingestionStatus === "processed" &&
      r.sensitivity !== "restricted" &&
      (!options.department || r.department === options.department)
  );

  const evidenceBlock = buildEvidenceBlock(processedEvidence);
  const evidenceRefs = processedEvidence.map((r) => r.id);
  const avgConfidence = computeAvgConfidence(processedEvidence);
  const minFreshness = computeMinFreshness(processedEvidence);
  const companyContext = profile ? buildCompanyContext(profile) : "";
  const languageInstruction = profile
    ? briefLanguageInstruction(profile.briefLanguageMode, profile.companyArchetype)
    : "";

  const agents = agentBriefIdsForRoleContext(role, profile?.companyArchetype)
    .map(agentForId)
    .filter((agent) => !options.agentId || agent.id === options.agentId);

  const cards = await Promise.all(
    agents.map((agent) =>
      generateCard(agent, role, evidenceBlock, evidenceRefs, avgConfidence, minFreshness, companyContext, languageInstruction, workspaceId)
    )
  );

  return cards;
}
