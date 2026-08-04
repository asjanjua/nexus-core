import type { Action, Decision, Entity, EvidenceRecord, Recommendation } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

export type EntityTimelineItem = {
  id: string;
  type: "evidence" | "decision" | "recommendation" | "action";
  title: string;
  timestamp: string;
  href?: string;
  meta?: string;
};

export type RelatedEntity = {
  entity: Entity;
  relationType: string;
  occurrenceCount: number;
};

export type EntityMemory = {
  entity: Entity;
  evidence: EvidenceRecord[];
  decisions: Decision[];
  recommendations: Recommendation[];
  actions: Action[];
  timeline: EntityTimelineItem[];
  /** One-hop neighbors in the entity relationship graph (migration 0041), ranked by co-occurrence strength. */
  relatedEntities: RelatedEntity[];
};

function includesName(value: string | undefined | null, name: string): boolean {
  return Boolean(value && value.toLowerCase().includes(name.toLowerCase()));
}

function overlaps(left: string[] = [], right: string[] = []): boolean {
  const wanted = new Set(left);
  return right.some((item) => wanted.has(item));
}

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

export async function getEntityMemory(workspaceId: string, entityId: string): Promise<EntityMemory | null> {
  const entities = await repository.listEntities(workspaceId, { limit: 250 });
  const entity = entities.find((item) => item.id === entityId);
  if (!entity) return null;

  const [workspaceEvidence, allDecisions, allRecommendations, allActions, relationships] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.listDecisions(workspaceId),
    repository.getRecommendations(workspaceId),
    repository.listActions(workspaceId),
    repository.listEntityRelationships(workspaceId, entity.id)
  ]);

  const entityById = new Map(entities.map((item) => [item.id, item]));
  const relatedEntities: RelatedEntity[] = relationships
    .map((rel) => {
      const neighborId = rel.sourceEntityId === entity.id ? rel.targetEntityId : rel.sourceEntityId;
      const neighbor = entityById.get(neighborId);
      if (!neighbor) return null;
      return { entity: neighbor, relationType: rel.relationType, occurrenceCount: rel.occurrenceCount };
    })
    .filter((item): item is RelatedEntity => item !== null);

  const evidence = workspaceEvidence
    .filter((record) => entity.evidenceRefs.includes(record.id) || includesName(record.text, entity.name))
    .slice(0, 50);
  const evidenceIds = evidence.map((record) => record.id);

  const recommendations = allRecommendations
    .filter((rec) =>
      rec.affectedEntityIds.includes(entity.id) ||
      overlaps(rec.evidenceRefs, evidenceIds) ||
      includesName(rec.title, entity.name) ||
      includesName(rec.owner, entity.name)
    )
    .slice(0, 25);

  const decisions = allDecisions
    .filter((decision) =>
      overlaps(decision.evidenceRefs ?? [], evidenceIds) ||
      includesName(decision.title, entity.name) ||
      includesName(decision.rationale, entity.name) ||
      includesName(decision.owner, entity.name)
    )
    .slice(0, 25);
  const decisionIds = new Set(decisions.map((decision) => decision.id));

  const actions = allActions
    .filter((action) =>
      decisionIds.has(action.decisionId) ||
      includesName(action.actionText, entity.name) ||
      includesName(action.owner, entity.name)
    )
    .slice(0, 25);

  const timeline: EntityTimelineItem[] = [
    ...evidence.map((record) => ({
      id: record.id,
      type: "evidence" as const,
      title: fileName(record.sourcePath),
      timestamp: record.sourceTimestamp,
      href: `/evidence/${record.id}`,
      meta: `${record.sourceType} · ${record.ingestionStatus}`
    })),
    ...recommendations.map((rec) => ({
      id: rec.id,
      type: "recommendation" as const,
      title: rec.title,
      timestamp: rec.updatedAt,
      href: "/recommendations",
      meta: `${rec.status} · ${Math.round(rec.confidence * 100)}% confidence`
    })),
    ...decisions.map((decision) => ({
      id: decision.id,
      type: "decision" as const,
      title: decision.title,
      timestamp: decision.updatedAt,
      href: "/decisions",
      meta: `${decision.status} · ${decision.priority}`
    })),
    ...actions.map((action) => ({
      id: action.id,
      type: "action" as const,
      title: action.actionText,
      timestamp: action.updatedAt,
      href: "/decisions",
      meta: `${action.status}${action.isBlocker ? " · blocker" : ""}`
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { entity, evidence, decisions, recommendations, actions, timeline, relatedEntities };
}
