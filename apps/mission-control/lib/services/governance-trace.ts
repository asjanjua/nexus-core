/**
 * Governance Trace
 *
 * Nexus already runs an agent graph on every leadership answer: dispatcher
 * hands work to specialist agents, red-team/output-gate checks run against
 * each output, decisions and actions get proposed from the surviving
 * evidence, and a human approves anything that matters. That pipeline is
 * real (see dispatcher.ts, synthesis.ts, red-team.ts) but it is invisible —
 * nothing shows a buyer how a given brief was actually produced.
 *
 * This module assembles that trail as a graph (nodes + edges) purely by
 * reading existing tables. No new schema, no new writes. It is read-only
 * aggregation, safe to call on demand.
 *
 * Shape returned: evidence -> agent output -> decision -> action, with any
 * governance checks (red-team block/escalation/review-required) attached to
 * the agent output that triggered them, plus evidence -> recommendation for
 * the parallel recommendation pipeline, so both real chains in the product
 * are represented honestly rather than merged into one that doesn't exist.
 */

import { repository } from "@/lib/data/repository";
import type { KnowledgeGraph } from "@/lib/contracts";

/** Audit event types that represent a governance check firing against an agent output. */
const GOVERNANCE_AUDIT_TYPES = new Set([
  "dashboard_output_blocked",
  "dashboard_output_escalated",
  "dashboard_output_review_required",
  "ask_output_blocked",
  "ask_output_escalated",
  "ask_output_review_required",
]);

function shorten(text: string, max = 42): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function checkNodeType(auditType: string): string {
  if (auditType.includes("blocked")) return "check_blocked";
  if (auditType.includes("escalated")) return "check_escalated";
  return "check_review";
}

export type GovernanceTraceOptions = {
  /** Restrict to agent outputs for one role (ceo, coo, cfo, ...). Undefined = all roles. */
  role?: string;
  /** Lookback window in days. Default 7, capped at 30. */
  days?: number;
  /** Max agent outputs to include. Default 12, capped at 25. */
  limit?: number;
};

export async function buildGovernanceTrace(
  workspaceId: string,
  opts: GovernanceTraceOptions = {}
): Promise<KnowledgeGraph> {
  const days = Math.min(30, Math.max(1, opts.days ?? 7));
  const limit = Math.min(25, Math.max(1, opts.limit ?? 12));
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const since = sinceDate.toISOString();

  const [outputs, decisions, allActions, recommendations, evidenceRecords, auditEvents] = await Promise.all([
    repository.listAgentOutputs({ workspaceId, since, limit }),
    repository.listDecisions(workspaceId),
    repository.listActions(workspaceId),
    repository.getRecommendations(workspaceId),
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getAuditEvents(workspaceId, 200),
  ]);

  const scopedOutputs = (opts.role ? outputs.filter((o) => o.roleKey === opts.role) : outputs).slice(0, limit);
  const outputIds = new Set(scopedOutputs.map((o) => o.id));
  const evidenceById = new Map(evidenceRecords.map((e) => [e.id, e]));

  const nodes = new Map<string, { id: string; label: string; type: string }>();
  const edges: KnowledgeGraph["edges"] = [];

  function addEvidenceNode(evidenceId: string): string {
    const nodeId = `evidence:${evidenceId}`;
    if (!nodes.has(nodeId)) {
      const record = evidenceById.get(evidenceId);
      nodes.set(nodeId, {
        id: nodeId,
        label: record ? shorten(fileName(record.sourcePath)) : shorten(evidenceId, 18),
        type: "evidence",
      });
    }
    return nodeId;
  }

  const recentChecks = auditEvents.filter(
    (event) => GOVERNANCE_AUDIT_TYPES.has(event.type) && new Date(event.timestamp) >= sinceDate
  );

  // Evidence -> agent output, agent output -> any governance check raised against it
  for (const output of scopedOutputs) {
    const outputNodeId = `output:${output.id}`;
    nodes.set(outputNodeId, { id: outputNodeId, label: `${output.agentId} · ${output.roleKey}`, type: "agent_output" });

    for (const ref of output.evidenceRefs.slice(0, 4)) {
      const evidenceNodeId = addEvidenceNode(ref);
      edges.push({ id: `cites-${ref}-${output.id}`, source: evidenceNodeId, target: outputNodeId, type: "cites", label: "evidence" });
    }

    const matchingChecks = recentChecks.filter((event) => {
      const payload = event.payload as { agentKey?: string; role?: string };
      return payload.agentKey === output.agentId && (!payload.role || payload.role === output.roleKey);
    });
    for (const check of matchingChecks.slice(0, 2)) {
      const checkNodeId = `check:${check.id}`;
      nodes.set(checkNodeId, {
        id: checkNodeId,
        label: check.type.replace(/^dashboard_output_|^ask_output_/, "").replace(/_/g, " "),
        type: checkNodeType(check.type),
      });
      edges.push({ id: `checked-${check.id}`, source: outputNodeId, target: checkNodeId, type: "checked_by", label: "governance check" });
    }
  }

  // Agent output -> decision (real FK: decisions.sourceOutputId) -> action (real FK: actions.decisionId)
  const relevantDecisions = decisions.filter((d) => d.sourceOutputId && outputIds.has(d.sourceOutputId));
  for (const decision of relevantDecisions) {
    const decisionNodeId = `decision:${decision.id}`;
    nodes.set(decisionNodeId, { id: decisionNodeId, label: shorten(decision.title), type: "decision" });
    edges.push({ id: `decides-${decision.id}`, source: `output:${decision.sourceOutputId}`, target: decisionNodeId, type: "proposed", label: "decision" });

    for (const action of allActions.filter((a) => a.decisionId === decision.id)) {
      const actionNodeId = `action:${action.id}`;
      nodes.set(actionNodeId, { id: actionNodeId, label: shorten(action.actionText), type: "action" });
      edges.push({ id: `requires-${action.id}`, source: decisionNodeId, target: actionNodeId, type: "requires", label: "action" });
    }
  }

  // Evidence -> recommendation (the parallel evidence -> recommendation -> approval pipeline),
  // scoped to evidence the agent outputs in view also cite, so the two chains stay connected.
  const scopedEvidenceIds = new Set(scopedOutputs.flatMap((o) => o.evidenceRefs));
  const relevantRecommendations = recommendations.filter(
    (r) => new Date(r.createdAt) >= sinceDate && r.evidenceRefs.some((id) => scopedEvidenceIds.has(id))
  );
  for (const rec of relevantRecommendations.slice(0, limit)) {
    const recNodeId = `recommendation:${rec.id}`;
    const statusType =
      rec.status === "approved" ? "recommendation_approved" : rec.status === "rejected" ? "recommendation_rejected" : "recommendation";
    nodes.set(recNodeId, { id: recNodeId, label: shorten(rec.title), type: statusType });

    for (const ref of rec.evidenceRefs.filter((id) => scopedEvidenceIds.has(id)).slice(0, 3)) {
      const evidenceNodeId = addEvidenceNode(ref);
      edges.push({ id: `informs-${ref}-${rec.id}`, source: evidenceNodeId, target: recNodeId, type: "informs", label: "recommendation" });
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}
