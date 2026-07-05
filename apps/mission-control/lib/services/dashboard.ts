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
import { getPrompt } from "@/lib/prompts/registry";
import { checkOutput } from "@/lib/security/red-team";
import { shouldRouteOutputToReview } from "@/lib/security/ai-policy";

// ---------------------------------------------------------------------------
// Agent prompt configuration
// ---------------------------------------------------------------------------

const DASHBOARD_SYSTEM_PROMPT = getPrompt("dashboard.agent-brief", { roleName: "specialist agent" });

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
      workspaceId,
      route: "dashboard",
      surfaceId: "dashboard_cards"
    });
  } catch {
    summary = `Evidence count: ${evidenceRefs.length}. AI synthesis unavailable — verify DEEPSEEK_API_KEY (or ANTHROPIC_API_KEY) is set in your Render environment.`;
  }

  let gateStatus: DashboardCard["gateStatus"] = "ok";
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
    gateStatus = "blocked";
  } else if (gate.escalationRequired) {
    await repository.pushAudit({
      workspaceId,
      type: "dashboard_output_escalated",
      actor: agent.id,
      payload: { agentKey: agent.id, reason: gate.reason, role }
    });
    summary = `${summary}\n\nHuman review required: ${gate.reason}.`;
  }

  const redTeam = checkOutput(summary, {
    workspaceId,
    agentId: agent.id,
    roleKey: role,
    maxSensitivity: passport?.maxSensitivity ?? "confidential",
    outputSensitivity: "internal",
    humanReviewGate: gate.escalationRequired
  });
  if (!redTeam.passed) {
    await repository.pushAudit({
      workspaceId,
      type: "red_team_violation",
      actor: agent.id,
      payload: { route: "dashboard", role, agentKey: agent.id, violations: redTeam.violations }
    });
    summary = "NexusAI blocked this agent brief because the safety review detected sensitive data, overconfident language, or an unsafe action. A human-reviewed brief is required.";
    gateStatus = "blocked";
  }

  const settings = await repository.getWorkspaceSettings(workspaceId);
  if (shouldRouteOutputToReview(settings, avgConfidence)) {
    await repository.pushAudit({
      workspaceId,
      type: "dashboard_output_review_required",
      actor: agent.id,
      payload: {
        role,
        agentKey: agent.id,
        confidence: avgConfidence,
        threshold: settings.approvalRequiredThreshold
      }
    });
    summary = "NexusAI held this agent brief for human review because evidence confidence is below the workspace threshold.";
    if (gateStatus === "ok") gateStatus = "held";
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
    outputVersion: output.outputVersion,
    gateStatus
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
          evidenceRefs: [],
          gateStatus: "suspended" as const
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
