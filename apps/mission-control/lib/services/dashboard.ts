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
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import { evaluateOutputGate } from "@/lib/agents/output-gate";
import type { AgentControlProfile } from "@/lib/contracts";

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
  workspaceId = "_global_",
  passport?: AgentControlProfile | null
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
  const startedAt = Date.now();
  try {
    summary = await ask(userPrompt, DASHBOARD_SYSTEM_PROMPT, {
      maxTokens: 256,
      temperature: 0.1,
      workspaceId
    });
  } catch {
    summary = `Evidence count: ${evidenceRefs.length}. AI synthesis unavailable — verify DEEPSEEK_API_KEY (or ANTHROPIC_API_KEY) is set in your Render environment.`;
  }

  const gate = passport ? evaluateOutputGate(summary, passport, passport.actionRight) : { allowed: true as const, escalationRequired: false as const };
  if (!gate.allowed) {
    await repository.pushAudit({
      workspaceId,
      type: "dashboard_output_blocked",
      actor: agent.id,
      payload: { agentKey: agent.id, reason: gate.reason, role }
    });
    await repository.suspendAgentControlProfile(workspaceId, agent.id, "output_gate");
    summary = "NexusAI blocked this agent brief because it appears to request or imply a hard-stop action that requires human handling.";
  } else if (gate.escalationRequired) {
    await repository.pushAudit({
      workspaceId,
      type: "dashboard_output_escalated",
      actor: agent.id,
      payload: { agentKey: agent.id, reason: gate.reason, role }
    });
    summary = `${summary}\n\nHuman review required: ${gate.reason}.`;
  }

  const output = await repository.saveAgentOutput({
    workspaceId,
    agentId: agent.id,
    agentVersion: passport?.version ?? 1,
    roleKey: role,
    content: summary,
    inputSummary: userPrompt.slice(0, 200),
    evidenceRefs,
    confidence: avgConfidence,
    processingMs: Date.now() - startedAt
  });

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
    evidenceRefs,
    outputId: output.id,
    outputVersion: output.outputVersion
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

  const companyContext = profile ? buildCompanyContext(profile) : "";
  const languageInstruction = profile
    ? briefLanguageInstruction(profile.briefLanguageMode, profile.companyArchetype)
    : "";

  const agents = agentBriefIdsForRoleContext(role, profile?.companyArchetype)
    .map(agentForId)
    .filter((agent) => !options.agentId || agent.id === options.agentId);

  const cards = await Promise.all(
    agents.map(async (agent) => {
      const passport = await repository.getActiveAgentControlProfile(workspaceId, agent.id);
      if (passport && passport.status !== "active") {
        await repository.pushAudit({
          workspaceId,
          type: "dashboard_agent_suspended",
          actor: agent.id,
          payload: { agentKey: agent.id, status: passport.status, role }
        });
        return {
          id: `${role}-${agent.id}`,
          role,
          agentId: agent.id,
          agentName: agent.name,
          agentRoom: agent.room,
          agentRoomLabel: (AGENT_ROOMS.find((item) => item.id === agent.room) ?? roomForRole(role)).label,
          mandate: agent.mandate,
          outputType: agent.outputType,
          approvalPolicy: agent.approvalPolicy,
          skillHints: agent.skillHints,
          suggestedNextAction: agent.suggestedNextAction,
          lastRunAt: new Date().toISOString(),
          title: `${agent.name} Brief`,
          summary: "This agent is suspended under its Agent Control Profile. No evidence was retrieved and no brief was generated.",
          confidence: 0,
          freshnessHours: 9999,
          evidenceRefs: []
        };
      }
      const governedEvidence = passport
        ? filterEvidenceByPassport(processedEvidence, passport)
        : { allowed: processedEvidence, denied: [] };

      if (passport && governedEvidence.denied.length) {
        void repository.pushAudit({
          workspaceId,
          type: "agent_evidence_denied",
          actor: agent.id,
          payload: {
            agentKey: agent.id,
            denied: governedEvidence.denied.map(({ record, reason }) => ({
              evidenceId: record.id,
              sensitivity: record.sensitivity,
              sourceType: record.sourceType,
              department: record.department ?? null,
              reason
            }))
          }
        });
      }

      const evidenceBlock = buildEvidenceBlock(governedEvidence.allowed);
      const evidenceRefs = governedEvidence.allowed.map((r) => r.id);
      const avgConfidence = computeAvgConfidence(governedEvidence.allowed);
      const minFreshness = computeMinFreshness(governedEvidence.allowed);

      return generateCard(agent, role, evidenceBlock, evidenceRefs, avgConfidence, minFreshness, companyContext, languageInstruction, workspaceId, passport);
    })
  );

  return cards;
}
