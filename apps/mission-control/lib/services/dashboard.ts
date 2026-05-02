/**
 * Role-aware dashboard card generation.
 *
 * Each role gets a focused prompt that instructs Claude to synthesize
 * role-specific insights from the same evidence base.
 * Falls back to statistical summary when LLM is unavailable.
 */

import type { DashboardCard, EvidenceRecord, Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";

// ---------------------------------------------------------------------------
// Role prompt configuration
// ---------------------------------------------------------------------------

type RoleConfig = {
  label: string;
  cards: Array<{
    id: string;
    title: string;
    focus: string;
  }>;
};

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  ceo: {
    label: "CEO",
    cards: [
      {
        id: "strategic-priorities",
        title: "Strategic Priorities",
        focus:
          "Identify the top 2-3 strategic priorities or decisions that need CEO attention based on this evidence. Be specific about what is at risk or pending."
      },
      {
        id: "top-risks",
        title: "Top Risks",
        focus:
          "Identify the most significant risks to the business visible in this evidence. Include what is driving each risk and its likely impact."
      },
      {
        id: "cross-functional-blockers",
        title: "Cross-Functional Blockers",
        focus:
          "What cross-functional issues or bottlenecks are visible in this evidence that require executive coordination or decision?"
      }
    ]
  },
  coo: {
    label: "COO",
    cards: [
      {
        id: "execution-status",
        title: "Execution Status",
        focus:
          "Summarize the operational execution status across the business. What is on track, what is delayed, and what is failing based on this evidence?"
      },
      {
        id: "process-issues",
        title: "Process Issues and Owner Map",
        focus:
          "What process breakdowns, handoff failures, or operational issues are visible? Identify responsible functions or owners where possible."
      },
      {
        id: "overdue-items",
        title: "Overdue and At-Risk Items",
        focus:
          "What items appear overdue, stalled, or at risk of missing targets? Be specific about what is overdue and by how long if evident."
      }
    ]
  },
  cbo: {
    label: "CBO/Strategy",
    cards: [
      {
        id: "growth-opportunities",
        title: "Growth Opportunities",
        focus:
          "What growth opportunities, partnership signals, or market themes are visible in this evidence? Include any pipeline or proposal status."
      },
      {
        id: "partner-pipeline",
        title: "Partner and BD Pipeline",
        focus:
          "Summarize the business development and partner pipeline status visible in the evidence. What is progressing, what is stalled?"
      },
      {
        id: "strategy-alignment",
        title: "Strategic Alignment",
        focus:
          "Are there any gaps between stated strategy and current execution visible in the evidence? What needs strategic course correction?"
      }
    ]
  },
  cto: {
    label: "CTO/CDO",
    cards: [
      {
        id: "tech-health",
        title: "Technology Health",
        focus:
          "What is the current technology health status? Identify any system reliability issues, tech debt risks, or infrastructure concerns visible in this evidence."
      },
      {
        id: "data-quality",
        title: "Data Quality and Governance",
        focus:
          "What does the evidence indicate about data quality, data pipeline health, and governance posture? Identify any data issues affecting executive outputs."
      },
      {
        id: "security-ai-posture",
        title: "Security and AI Pipeline Status",
        focus:
          "What security risks, compliance gaps, or AI model performance issues are visible? Include anything that could affect data handling or regulatory exposure."
      }
    ]
  }
};

const DASHBOARD_SYSTEM_PROMPT = `You are an executive intelligence analyst for NexusAI Mission Control.
Your role is to synthesize evidence into concise, actionable dashboard cards for senior executives.

Rules:
- Write 2-4 sentences maximum per card.
- Be specific. Reference facts from the evidence directly. Do not invent information.
- Use executive language: clear, direct, no jargon.
- If evidence is insufficient for a card topic, say: "Insufficient evidence - [what is missing]."
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
  cardConfig: RoleConfig["cards"][number],
  role: Role,
  evidenceBlock: string,
  evidenceRefs: string[],
  avgConfidence: number,
  minFreshness: number
): Promise<DashboardCard> {
  const userPrompt = `Evidence:\n\n${evidenceBlock}\n\nTask: ${cardConfig.focus}`;

  let summary: string;
  try {
    summary = await ask(userPrompt, DASHBOARD_SYSTEM_PROMPT, {
      maxTokens: 256,
      temperature: 0.1
    });
  } catch {
    summary = `Evidence count: ${evidenceRefs.length}. AI synthesis unavailable - set ANTHROPIC_API_KEY to enable.`;
  }

  return {
    id: `${role}-${cardConfig.id}`,
    role,
    title: cardConfig.title,
    summary,
    confidence: avgConfidence,
    freshnessHours: minFreshness,
    evidenceRefs
  };
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export async function cardsForRole(role: Role): Promise<DashboardCard[]> {
  const workspaceId = process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const allEvidence = await repository.getEvidenceForWorkspace(workspaceId);

  const processedEvidence = allEvidence.filter(
    (r) => r.ingestionStatus === "processed" && r.sensitivity !== "restricted"
  );

  const evidenceBlock = buildEvidenceBlock(processedEvidence);
  const evidenceRefs = processedEvidence.map((r) => r.id);
  const avgConfidence = computeAvgConfidence(processedEvidence);
  const minFreshness = computeMinFreshness(processedEvidence);

  const config = ROLE_CONFIG[role];

  const cards = await Promise.all(
    config.cards.map((cardConfig) =>
      generateCard(cardConfig, role, evidenceBlock, evidenceRefs, avgConfidence, minFreshness)
    )
  );

  return cards;
}
