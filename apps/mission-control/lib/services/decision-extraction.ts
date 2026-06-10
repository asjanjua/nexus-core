import { z } from "zod";
import type { AgentOutput, DecisionPriority } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";

export const proposedActionSchema = z.object({
  actionText: z.string().min(1).max(1000),
  owner: z.string().min(1).max(120),
  dueDate: z.string().optional().nullable(),
  isBlocker: z.boolean().default(false)
});

export const proposedDecisionSchema = z.object({
  title: z.string().min(1).max(500),
  owner: z.string().min(1).max(120),
  rationale: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  sourceOutputId: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
  actions: z.array(proposedActionSchema).default([])
});

export type ProposedDecision = z.infer<typeof proposedDecisionSchema>;

const extractionResponseSchema = z.object({
  decisions: z.array(proposedDecisionSchema).max(8)
});

const SYSTEM_PROMPT = `You are NexusAI's Decision & Action Twin extractor.
Extract only explicit or strongly implied business decisions and action items from agent outputs.

Rules:
- Return JSON only, no markdown.
- Do not invent facts, dates, owners, or actions.
- If owner is unclear, use "Unassigned".
- If due date is unclear, use null.
- Use priority: critical only for urgent existential/regulatory/client-loss issues; high for material commercial/operational risk; medium by default; low for housekeeping.
- Keep rationale tied to the supplied output and evidence references.
- Prefer fewer high-quality decisions over many weak guesses.

JSON shape:
{
  "decisions": [
    {
      "title": "Decision needed...",
      "owner": "Name or role",
      "rationale": "Why this decision matters based on the output.",
      "priority": "low|medium|high|critical",
      "sourceOutputId": "output id",
      "evidenceRefs": ["evidence id"],
      "actions": [
        {
          "actionText": "Specific next action",
          "owner": "Name or role",
          "dueDate": null,
          "isBlocker": false
        }
      ]
    }
  ]
}`;

function outputContext(outputs: AgentOutput[]): string {
  return outputs
    .map((output, index) => {
      const refs = output.evidenceRefs.length ? output.evidenceRefs.join(", ") : "none";
      return [
        `[Output ${index + 1}]`,
        `id: ${output.id}`,
        `agent: ${output.agentId}`,
        `role: ${output.roleKey}`,
        `confidence: ${Math.round(output.confidence * 100)}%`,
        `evidenceRefs: ${refs}`,
        `content: ${output.content}`
      ].join("\n");
    })
    .join("\n\n");
}

function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function fallbackExtract(outputs: AgentOutput[]): ProposedDecision[] {
  const triggers = /\b(decision|decide|approve|approval|recommend|resolve|prioriti[sz]e|blocker|risk|owner|next action)\b/i;
  return outputs
    .filter((output) => triggers.test(output.content))
    .slice(0, 4)
    .map((output) => {
      const firstSentence = output.content
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)[0]
        ?.slice(0, 220);
      return {
        title: firstSentence || `${output.agentId.replace(/_/g, " ")} follow-up decision`,
        owner: "Unassigned",
        rationale: output.content.slice(0, 600),
        priority: /critical|urgent|regulator|board|client loss|blocked|blocker/i.test(output.content)
          ? "high"
          : "medium" as DecisionPriority,
        sourceOutputId: output.id,
        evidenceRefs: output.evidenceRefs,
        actions: [
          {
            actionText: "Review this proposed decision and assign an accountable owner.",
            owner: "Unassigned",
            dueDate: null,
            isBlocker: /blocked|blocker/i.test(output.content)
          }
        ]
      };
    });
}

export async function proposeDecisionsFromAgentOutputs(input: {
  workspaceId: string;
  agentId?: string;
  days?: number;
  limit?: number;
}): Promise<ProposedDecision[]> {
  const days = Math.min(30, Math.max(1, input.days ?? 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const outputs = await repository.listAgentOutputs({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    since,
    limit: Math.min(25, Math.max(1, input.limit ?? 12))
  });

  const activeOutputs = outputs.filter((output) => output.isActive);
  if (!activeOutputs.length) return [];

  try {
    const text = await ask(
      `Agent outputs:\n\n${outputContext(activeOutputs)}`,
      SYSTEM_PROMPT,
      {
        maxTokens: 1400,
        temperature: 0.05,
        workspaceId: input.workspaceId,
        route: "decision_extraction"
      }
    );
    const parsed = extractionResponseSchema.safeParse(JSON.parse(stripJsonFence(text)));
    if (!parsed.success) return fallbackExtract(activeOutputs);

    const validOutputIds = new Set(activeOutputs.map((output) => output.id));
    const refsByOutputId = new Map(activeOutputs.map((output) => [output.id, output.evidenceRefs]));
    return parsed.data.decisions
      .filter((decision) => !decision.sourceOutputId || validOutputIds.has(decision.sourceOutputId))
      .map((decision) => ({
        ...decision,
        evidenceRefs:
          decision.evidenceRefs.length || !decision.sourceOutputId
            ? decision.evidenceRefs
            : refsByOutputId.get(decision.sourceOutputId) ?? []
      }));
  } catch {
    return fallbackExtract(activeOutputs);
  }
}
