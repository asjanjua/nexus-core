import {
  type Action,
  type ActionStatus,
  type AgentKey,
  type AgentOutput,
  type AgentOutputInput,
  type AgentControlProfile,
  type AgentScope,
  type ConversationMessage,
  type Decision,
  type DecisionStatus,
  type Entity,
  type EntityInput,
  type EvidenceRecord,
  type IngestionStatus,
  type KnowledgeLink,
  type KnowledgeNote,
  type KnowledgeNoteInput,
  type KnowledgeSyncEvent,
  type LearningSignal,
  type PilotOutcome,
  type Recommendation,
  type RecommendationStatus,
  type ReviewerSeat,
  type Role,
  type Sensitivity,
  type StrategyProfile,
  type SynthesisSchedule,
  type SynthesisScheduleInput,
  type SynthesisScheduleStatus,
  type WorkflowTwin,
  type WorkflowTwinInput,
  type WorkflowTwinRun,
  type WorkflowTwinRunInput,
  type WorkspaceProfile,
  type WorkspaceSettings
} from "@/lib/contracts";
import type { ConnectorRecord } from "@/lib/data/repository";
import { applyKnowledgeFilters, buildKnowledgeLinks, defaultKnowledgePath, extractKnowledge, searchKnowledgeNotes } from "@/lib/knowledge/markdown";
import type { KnowledgeFilterOptions } from "@/lib/knowledge/markdown";

type AuditEvent = {
  id: string;
  workspaceId: string;
  type: string;
  actor: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

type ConversationStore = Record<string, ConversationMessage[]>;

const nowIso = () => new Date().toISOString();

const evidence: EvidenceRecord[] = [
  {
    id: "ev-001",
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    sourceType: "document",
    sourcePath: "/sources/board/board-pack-apr-2026.pdf",
    sourceUri: "gs://nexus-demo/board-pack-apr-2026.pdf",
    sourceTimestamp: "2026-04-28T08:00:00Z",
    ingestedAt: "2026-04-28T09:00:00Z",
    hash: "sha256:boardpack001",
    sensitivity: "confidential",
    extractionConfidence: 0.89,
    ingestionStatus: "processed",
    freshnessHours: 72,
    text: "Board pack flagged margin compression in segment B and unresolved pricing decision for Q3."
  },
  {
    id: "ev-002",
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    sourceType: "slack",
    sourcePath: "#exec-thread/1744.1201",
    sourceUri: "slack://workspace-demo/C001/1744.1201",
    sourceTimestamp: "2026-04-29T11:15:00Z",
    ingestedAt: "2026-04-29T11:17:00Z",
    hash: "sha256:slackthread002",
    sensitivity: "internal",
    extractionConfidence: 0.82,
    ingestionStatus: "processed",
    freshnessHours: 48,
    text: "COO reported onboarding delays and handoff failures in KYC workflow."
  },
  {
    id: "ev-003",
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    sourceType: "upload",
    sourcePath: "/uploads/risk-register-draft.docx",
    sourceTimestamp: "2026-04-30T09:20:00Z",
    ingestedAt: "2026-04-30T09:20:00Z",
    hash: "sha256:riskdraft003",
    sensitivity: "restricted",
    extractionConfidence: 0.41,
    ingestionStatus: "quarantined",
    freshnessHours: 24,
    text: "Draft register with personally identifiable details and incomplete extraction."
  }
];

const recommendations: Recommendation[] = [
  {
    id: "rec-001",
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    title: "Close KYC handoff bottleneck in onboarding",
    owner: "coo_agent",
    status: "in_review",
    confidence: 0.84,
    affectedEntityIds: ["process:kyc-handoff", "kpi:onboarding-cycle-time"],
    evidenceRefs: ["ev-002"],
    createdAt: "2026-04-29T12:00:00Z",
    updatedAt: "2026-04-29T12:00:00Z"
  },
  {
    id: "rec-002",
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    title: "Resolve Q3 pricing decision with explicit margin floor",
    owner: "ceo_agent",
    status: "draft",
    confidence: 0.78,
    affectedEntityIds: ["decision:pricing-q3", "kpi:gross-margin"],
    evidenceRefs: ["ev-001"],
    createdAt: "2026-04-30T10:00:00Z",
    updatedAt: "2026-04-30T10:00:00Z"
  }
];

const decisions: Decision[] = [
  {
    id: "dec-001",
    workspaceId: "workspace-demo",
    title: "Partner replication remains deferred until post-pilot",
    owner: "manager_agent",
    rationale: "Pilot must prioritize evidence and governance reliability before replication complexity.",
    status: "decided",
    sourceOutputId: null,
    deadline: null,
    priority: "medium",
    evidenceRefs: ["ev-001", "ev-002"],
    decidedAt: "2026-04-30T13:30:00Z",
    createdAt: "2026-04-30T13:30:00Z",
    updatedAt: "2026-04-30T13:30:00Z"
  }
];

const actionStore: Action[] = [];
const auditEvents: AuditEvent[] = [];
const dispatchJobStore: unknown[] = [];
const conversations: ConversationStore = {};
const agentOutputs: AgentOutput[] = [];
const learningSignalStore: LearningSignal[] = [];
const entityStore: Entity[] = [];
const synthesisScheduleStore: SynthesisSchedule[] = [];
const workflowTwinStore: WorkflowTwin[] = [];
const workflowTwinRunStore: WorkflowTwinRun[] = [];
// Strategy profile fallback for no-DB/demo mode, keyed by workspaceId.
const strategyProfileStore = new Map<string, StrategyProfile>();
// Reviewer seat fallback for no-DB/demo mode, keyed by seat id. The invite
// code hash is kept internally and never returned to callers.
type StoredReviewerSeat = ReviewerSeat & { inviteCodeHash: string };
const reviewerSeatStore = new Map<string, StoredReviewerSeat>();

function publicReviewerSeat(seat: StoredReviewerSeat): ReviewerSeat {
  const { inviteCodeHash: _hash, ...rest } = seat;
  return rest;
}
// Pilot outcome fallback for no-DB/demo mode, keyed by `${workspaceId}::${workflowName}`.
const pilotOutcomeStore = new Map<string, PilotOutcome>();
function pilotOutcomeKey(workspaceId: string, workflowName: string): string {
  return `${workspaceId}::${workflowName}`;
}
const knowledgeNoteStore: KnowledgeNote[] = [];
const knowledgeLinkStore: KnowledgeLink[] = [];
const knowledgeSyncEventStore: KnowledgeSyncEvent[] = [];

// Agent keys in-memory store (keyed by workspaceId)
type StoredAgentKey = AgentKey & { keyHash: string };
const agentKeyStore: StoredAgentKey[] = [];
const agentControlProfileStore: AgentControlProfile[] = [];

// Workspace settings in-memory store
const workspaceSettingsStore: Map<string, WorkspaceSettings> = new Map([
  [
    "workspace-demo",
    {
      workspaceId: "workspace-demo",
      name: "NexusAI Demo Workspace",
      timezone: "UTC",
      llmProvider: "anthropic",
      llmModel: "claude-opus-4-6",
      quarantineThreshold: 0.55,
      defaultSensitivity: "internal",
      slackEnabled: false,
      teamsEnabled: false,
      allowedProviders: ["anthropic", "deepseek", "openai_compatible"],
      localOnlyMode: false,
      sensitivityCeiling: "confidential",
      approvalRequiredThreshold: 0.7,
      demoMode: false,
      updatedAt: new Date().toISOString()
    }
  ]
]);

const connectorStore: ConnectorRecord[] = [];

// Workspace profile in-memory store
const workspaceProfileStore: Map<string, WorkspaceProfile> = new Map();

function pushAudit(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const record = {
    id: `audit-${auditEvents.length + 1}`,
    timestamp: nowIso(),
    ...event
  };
  auditEvents.push(record);
  return record;
}

export const store = {
  evidence,
  recommendations,
  decisions,
  auditEvents,
  agentOutputs,
  conversations,
  entities: entityStore,
  workflowTwins: workflowTwinStore,
  workflowTwinRuns: workflowTwinRunStore,
  knowledgeNotes: knowledgeNoteStore,
  knowledgeLinks: knowledgeLinkStore,
  dispatchJobs: dispatchJobStore,
  getEvidenceById(id: string): EvidenceRecord | undefined {
    return evidence.find((item) => item.id === id);
  },
  getEvidenceForWorkspace(workspaceId: string): EvidenceRecord[] {
    return evidence.filter((item) => item.workspaceId === workspaceId);
  },
  getRecommendations(workspaceId: string): Recommendation[] {
    return recommendations.filter((item) => item.workspaceId === workspaceId);
  },
  listEntities(workspaceId: string, options: { type?: string; query?: string; limit?: number } = {}): Entity[] {
    const q = options.query?.toLowerCase();
    return entityStore
      .filter((entity) => entity.workspaceId === workspaceId)
      .filter((entity) => !options.type || entity.type === options.type)
      .filter((entity) => !q || entity.name.toLowerCase().includes(q))
      .slice(0, options.limit ?? 100);
  },
  upsertEntity(input: EntityInput): Entity {
    const normalizedName = input.name.trim();
    const existing = entityStore.find(
      (entity) =>
        entity.workspaceId === input.workspaceId &&
        entity.type === input.type &&
        entity.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (existing) {
      existing.metadata = { ...existing.metadata, ...input.metadata };
      existing.confidence = Math.max(existing.confidence, input.confidence);
      if (!existing.evidenceRefs.includes(input.evidenceId)) existing.evidenceRefs.push(input.evidenceId);
      return existing;
    }
    const record: Entity = {
      id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: input.workspaceId,
      type: input.type,
      name: normalizedName,
      metadata: input.metadata,
      evidenceRefs: [input.evidenceId],
      confidence: input.confidence,
      createdAt: nowIso()
    };
    entityStore.push(record);
    return record;
  },
  listKnowledgeNotes(
    workspaceId: string,
    options: { query?: string; limit?: number } & KnowledgeFilterOptions = {}
  ): KnowledgeNote[] {
    let notes = knowledgeNoteStore
      .filter((note) => note.workspaceId === workspaceId && note.status !== "deleted")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (options.query) notes = searchKnowledgeNotes(notes, options.query, 500).map((result) => result.note);
    notes = applyKnowledgeFilters(notes, options);
    return notes.slice(0, options.limit ?? 100);
  },
  getKnowledgeNote(workspaceId: string, id: string): KnowledgeNote | null {
    return knowledgeNoteStore.find((note) => note.workspaceId === workspaceId && note.id === id && note.status !== "deleted") ?? null;
  },
  getKnowledgeNoteByPath(workspaceId: string, path: string): KnowledgeNote | null {
    return knowledgeNoteStore.find((note) => note.workspaceId === workspaceId && note.path.toLowerCase() === path.toLowerCase() && note.status !== "deleted") ?? null;
  },
  upsertKnowledgeNote(workspaceId: string, input: KnowledgeNoteInput, actor: string, id?: string): KnowledgeNote {
    const now = nowIso();
    const existing = id
      ? knowledgeNoteStore.find((note) => note.workspaceId === workspaceId && note.id === id)
      : input.path
        ? knowledgeNoteStore.find((note) => note.workspaceId === workspaceId && note.path.toLowerCase() === input.path?.toLowerCase())
        : undefined;
    const extracted = extractKnowledge(input.body, input.frontmatter);
    const record: KnowledgeNote = {
      id: existing?.id ?? `kn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      title: input.title,
      path: input.path ?? existing?.path ?? defaultKnowledgePath(input.title),
      body: input.body,
      tags: Array.from(new Set([...(input.tags ?? []), ...extracted.tags])),
      sensitivity: input.sensitivity ?? "internal",
      status: input.status ?? "active",
      sourceKind: input.sourceKind ?? "manual",
      frontmatter: input.frontmatter ?? {},
      evidenceRefs: Array.from(new Set([...(input.evidenceRefs ?? []), ...extracted.evidenceRefs])),
      entityRefs: Array.from(new Set([...(input.entityRefs ?? []), ...extracted.entityRefs])),
      workflowRefs: Array.from(new Set([...(input.workflowRefs ?? []), ...extracted.workflowRefs])),
      decisionRefs: Array.from(new Set([...(input.decisionRefs ?? []), ...extracted.decisionRefs])),
      recommendationRefs: Array.from(new Set([...(input.recommendationRefs ?? []), ...extracted.recommendationRefs])),
      createdBy: existing?.createdBy ?? actor,
      updatedBy: actor,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    const idx = knowledgeNoteStore.findIndex((note) => note.id === record.id);
    if (idx >= 0) knowledgeNoteStore[idx] = record;
    else knowledgeNoteStore.push(record);
    this.replaceKnowledgeLinks(workspaceId, record.id, buildKnowledgeLinks(record));
    return record;
  },
  deleteKnowledgeNote(workspaceId: string, id: string, actor = "system"): boolean {
    const note = knowledgeNoteStore.find((item) => item.workspaceId === workspaceId && item.id === id);
    if (!note) return false;
    note.status = "deleted";
    note.updatedAt = nowIso();
    note.updatedBy = actor;
    knowledgeLinkStore.splice(0, knowledgeLinkStore.length, ...knowledgeLinkStore.filter((link) => link.sourceNoteId !== id));
    return true;
  },
  replaceKnowledgeLinks(
    workspaceId: string,
    sourceNoteId: string,
    links: Array<Omit<KnowledgeLink, "id" | "workspaceId" | "sourceNoteId" | "createdAt">>
  ): KnowledgeLink[] {
    const now = nowIso();
    for (let i = knowledgeLinkStore.length - 1; i >= 0; i--) {
      if (knowledgeLinkStore[i].workspaceId === workspaceId && knowledgeLinkStore[i].sourceNoteId === sourceNoteId) {
        knowledgeLinkStore.splice(i, 1);
      }
    }
    const records = links.map((link, index) => ({
      id: `kl-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      sourceNoteId,
      ...link,
      createdAt: now
    }));
    knowledgeLinkStore.push(...records);
    return records;
  },
  listKnowledgeLinks(workspaceId: string, sourceNoteId?: string): KnowledgeLink[] {
    return knowledgeLinkStore.filter((link) => link.workspaceId === workspaceId && (!sourceNoteId || link.sourceNoteId === sourceNoteId));
  },
  searchKnowledge(workspaceId: string, query: string, limit = 20) {
    return searchKnowledgeNotes(this.listKnowledgeNotes(workspaceId, { limit: 500 }), query, limit);
  },
  recordKnowledgeSyncEvent(input: Omit<KnowledgeSyncEvent, "id" | "createdAt">): KnowledgeSyncEvent {
    const event: KnowledgeSyncEvent = {
      id: `kse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: nowIso(),
      ...input
    };
    knowledgeSyncEventStore.push(event);
    return event;
  },
  listKnowledgeSyncEvents(workspaceId: string, limit = 20): KnowledgeSyncEvent[] {
    return knowledgeSyncEventStore
      .filter((event) => event.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
  addRecommendation(rec: Recommendation): Recommendation {
    recommendations.push(rec);
    return rec;
  },
  updateRecommendationStatus(id: string, status: RecommendationStatus, actor = "system"): Recommendation | undefined {
    const rec = recommendations.find((item) => item.id === id);
    if (!rec) return undefined;
    rec.status = status;
    rec.updatedAt = nowIso();
    pushAudit({
      workspaceId: rec.workspaceId,
      type: "recommendation_status_updated",
      actor,
      payload: { recommendationId: id, status }
    });
    return rec;
  },
  getDecisions(workspaceId: string): Decision[] {
    return decisions.filter((item) => item.workspaceId === workspaceId);
  },

  saveDecision(decision: Decision): Decision {
    const idx = decisions.findIndex((d) => d.id === decision.id);
    if (idx >= 0) decisions[idx] = decision;
    else decisions.push(decision);
    return decision;
  },

  listActions(workspaceId: string, decisionId?: string, status?: ActionStatus): Action[] {
    return actionStore
      .filter((a) => a.workspaceId === workspaceId)
      .filter((a) => !decisionId || a.decisionId === decisionId)
      .filter((a) => !status || a.status === status)
      .sort((a, b) => {
        // blockers first, then by due date ascending, then newest
        if (a.isBlocker !== b.isBlocker) return a.isBlocker ? -1 : 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  },

  saveAction(action: Action): Action {
    const idx = actionStore.findIndex((a) => a.id === action.id);
    if (idx >= 0) actionStore[idx] = action;
    else actionStore.push(action);
    return action;
  },
  listWorkflowTwins(workspaceId: string): WorkflowTwin[] {
    return workflowTwinStore
      .filter((twin) => twin.workspaceId === workspaceId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  getWorkflowTwin(workspaceId: string, id: string): WorkflowTwin | null {
    return workflowTwinStore.find((twin) => twin.workspaceId === workspaceId && twin.id === id) ?? null;
  },
  createWorkflowTwin(workspaceId: string, input: WorkflowTwinInput, actor: string): WorkflowTwin {
    const now = nowIso();
    const record: WorkflowTwin = {
      id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      type: input.type,
      name: input.name,
      status: input.status ?? "draft",
      config: input.config ?? {},
      owner: input.owner ?? null,
      createdBy: actor,
      createdAt: now,
      updatedBy: actor,
      updatedAt: now
    };
    workflowTwinStore.push(record);
    pushAudit({
      workspaceId,
      type: "workflow_twin_created",
      actor,
      payload: { twinId: record.id, twinType: record.type, name: record.name, status: record.status }
    });
    return record;
  },
  upsertWorkflowTwin(record: WorkflowTwin): void {
    const idx = workflowTwinStore.findIndex(
      (twin) => twin.workspaceId === record.workspaceId && twin.id === record.id
    );
    if (idx >= 0) workflowTwinStore[idx] = record;
    else workflowTwinStore.push(record);
  },
  listWorkflowTwinRuns(workspaceId: string, twinId?: string): WorkflowTwinRun[] {
    return workflowTwinRunStore
      .filter((run) => run.workspaceId === workspaceId)
      .filter((run) => !twinId || run.twinId === twinId)
      .sort((a, b) => b.runAt.localeCompare(a.runAt));
  },
  createWorkflowTwinRun(
    workspaceId: string,
    twin: WorkflowTwin,
    input: WorkflowTwinRunInput,
    actor: string
  ): WorkflowTwinRun {
    const now = nowIso();
    const record: WorkflowTwinRun = {
      id: `wtr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      twinId: twin.id,
      twinType: twin.type,
      evidenceRefs: input.evidenceRefs ?? [],
      generatedOutputRefs: input.generatedOutputRefs ?? [],
      confidence: input.confidence ?? 0.7,
      status: input.status ?? "generated",
      summary: input.summary,
      payload: input.payload ?? {},
      runAt: now,
      reviewedBy: null,
      reviewedAt: null
    };
    workflowTwinRunStore.push(record);
    pushAudit({
      workspaceId,
      type: "workflow_twin_run_created",
      actor,
      payload: {
        twinId: twin.id,
        runId: record.id,
        twinType: twin.type,
        status: record.status,
        evidenceRefs: record.evidenceRefs,
        generatedOutputRefs: record.generatedOutputRefs,
        confidence: record.confidence
      }
    });
    return record;
  },
  appendConversation(workspaceId: string, userId: string, role: "user" | "assistant", text: string): ConversationMessage {
    const key = `${workspaceId}:${userId}`;
    if (!conversations[key]) conversations[key] = [];
    const record = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      userId,
      role,
      text,
      createdAt: nowIso()
    };
    conversations[key].push(record);
    return record;
  },
  getConversation(workspaceId: string, userId: string, limit = 20): ConversationMessage[] {
    return (conversations[`${workspaceId}:${userId}`] ?? []).slice(-limit);
  },
  clearConversation(workspaceId: string, userId: string): void {
    conversations[`${workspaceId}:${userId}`] = [];
  },
  pushAudit,
  getAuditEvents(workspaceId: string, limit = 20): AuditEvent[] {
    return auditEvents
      .filter((e) => e.workspaceId === workspaceId)
      .slice(-limit)
      .reverse();
  },
  listAgentOutputs(input: {
    workspaceId: string;
    agentId?: string;
    /** undefined = don't filter by department; null = match untagged rows only. */
    department?: string | null;
    actionType?: string;
    since?: string;
    limit?: number;
  }): AgentOutput[] {
    const sinceTime = input.since ? new Date(input.since).getTime() : null;
    return agentOutputs
      .filter((output) => output.workspaceId === input.workspaceId)
      .filter((output) => !input.agentId || output.agentId === input.agentId)
      .filter((output) => input.department === undefined || (output.department ?? null) === (input.department ?? null))
      .filter((output) => !sinceTime || new Date(output.createdAt).getTime() >= sinceTime)
      .filter((output) => !input.actionType || input.actionType === "agent_output_created")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, input.limit ?? 50);
  },
  saveAgentOutput(input: AgentOutputInput): AgentOutput {
    const { processingMs, ...recordInput } = input;
    const department = recordInput.department ?? null;
    const prior = agentOutputs
      .filter((output) =>
        output.workspaceId === recordInput.workspaceId &&
        output.agentId === recordInput.agentId &&
        output.roleKey === recordInput.roleKey &&
        (output.department ?? null) === department
      )
      .sort((a, b) => b.outputVersion - a.outputVersion)[0];
    const version = prior ? prior.outputVersion + 1 : 1;
    const record: AgentOutput = {
      id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...recordInput,
      department,
      outputVersion: version,
      isActive: true,
      replacedById: null,
      createdAt: nowIso()
    };
    for (const output of agentOutputs) {
      if (
        output.workspaceId === recordInput.workspaceId &&
        output.agentId === recordInput.agentId &&
        output.roleKey === recordInput.roleKey &&
        (output.department ?? null) === department &&
        output.isActive
      ) {
        output.isActive = false;
        output.replacedById = record.id;
      }
    }
    agentOutputs.push(record);
    pushAudit({
      workspaceId: recordInput.workspaceId,
      type: "agent_output_created",
      actor: recordInput.agentId,
      payload: {
        agentId: recordInput.agentId,
        agentVersion: recordInput.agentVersion,
        roleKey: recordInput.roleKey,
        outputId: record.id,
        outputVersion: record.outputVersion,
        inputSummary: recordInput.inputSummary,
        evidenceIdsUsed: recordInput.evidenceRefs,
        confidence: recordInput.confidence,
        processingMs: processingMs ?? null
      }
    });
    return record;
  },
  rollbackAgentOutput(workspaceId: string, outputId: string, actor = "system", reason = ""): AgentOutput | null {
    const target = agentOutputs.find((output) => output.workspaceId === workspaceId && output.id === outputId);
    if (!target) return null;
    const active = agentOutputs.find((output) =>
      output.workspaceId === workspaceId &&
      output.agentId === target.agentId &&
      output.roleKey === target.roleKey &&
      output.isActive
    );
    if (active) {
      active.isActive = false;
      active.replacedById = target.id;
    }
    target.isActive = true;
    target.replacedById = null;
    pushAudit({
      workspaceId,
      type: "agent_output_rolled_back",
      actor,
      payload: {
        agentId: target.agentId,
        rolledBackFrom: active?.id ?? null,
        rolledBackTo: target.id,
        reason
      }
    });
    return target;
  },
  getSynthesisSchedule(workspaceId: string): SynthesisSchedule | null {
    return synthesisScheduleStore.find((schedule) => schedule.workspaceId === workspaceId) ?? null;
  },
  listEnabledSynthesisSchedules(): SynthesisSchedule[] {
    return synthesisScheduleStore.filter((schedule) => schedule.enabled);
  },
  upsertSynthesisSchedule(
    workspaceId: string,
    input: SynthesisScheduleInput,
    actor = "system"
  ): SynthesisSchedule {
    const now = nowIso();
    const existing = synthesisScheduleStore.find((schedule) => schedule.workspaceId === workspaceId);
    const record: SynthesisSchedule = {
      id: existing?.id ?? `synth-schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      enabled: input.enabled,
      cron: input.cron,
      timezone: input.timezone,
      roles: input.roles,
      delivery: input.delivery,
      emailTargets: input.emailTargets,
      slackChannel: input.slackChannel ?? null,
      lastRunAt: existing?.lastRunAt ?? null,
      lastStatus: existing?.lastStatus ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    if (existing) {
      Object.assign(existing, record);
    } else {
      synthesisScheduleStore.push(record);
    }
    pushAudit({
      workspaceId,
      type: "synthesis_schedule_updated",
      actor,
      payload: {
        enabled: record.enabled,
        cron: record.cron,
        timezone: record.timezone,
        roles: record.roles,
        delivery: record.delivery
      }
    });
    return record;
  },
  updateSynthesisScheduleLastRun(
    workspaceId: string,
    status: SynthesisScheduleStatus
  ): SynthesisSchedule | null {
    const schedule = synthesisScheduleStore.find((item) => item.workspaceId === workspaceId);
    if (!schedule) return null;
    schedule.lastRunAt = nowIso();
    schedule.lastStatus = status;
    schedule.updatedAt = nowIso();
    return schedule;
  },
  listAgentControlProfiles(workspaceId: string): AgentControlProfile[] {
    return agentControlProfileStore
      .filter((profile) => profile.workspaceId === workspaceId)
      .sort((a, b) => b.version - a.version);
  },
  getAgentControlProfileHistory(workspaceId: string, agentKey: string): AgentControlProfile[] {
    return agentControlProfileStore
      .filter((profile) => profile.workspaceId === workspaceId && profile.agentKey === agentKey)
      .sort((a, b) => b.version - a.version);
  },
  getActiveAgentControlProfile(workspaceId: string, agentKey: string): AgentControlProfile | null {
    return (
      agentControlProfileStore
        .filter((profile) => profile.workspaceId === workspaceId && profile.agentKey === agentKey && profile.status === "active")
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  },
  addAgentControlProfile(profile: AgentControlProfile): AgentControlProfile {
    agentControlProfileStore.push(profile);
    pushAudit({
      workspaceId: profile.workspaceId,
      type: "agent_control_profile_created",
      actor: profile.createdBy,
      payload: { agentKey: profile.agentKey, version: profile.version, status: profile.status }
    });
    return profile;
  },
  suspendAgentControlProfile(workspaceId: string, agentKey: string, actor = "system"): AgentControlProfile | null {
    const active = store.getActiveAgentControlProfile(workspaceId, agentKey);
    if (!active) return null;
    active.status = "suspended";
    active.updatedBy = actor;
    active.updatedAt = nowIso();
    pushAudit({
      workspaceId,
      type: "agent_control_profile_suspended",
      actor,
      payload: { agentKey, version: active.version }
    });
    return active;
  },
  addEvidenceRecord(record: EvidenceRecord): EvidenceRecord {
    evidence.push(record);
    pushAudit({
      workspaceId: record.workspaceId,
      type: "evidence_ingested",
      actor: "ingestion_pipeline",
      payload: { evidenceId: record.id, status: record.ingestionStatus }
    });
    return record;
  },
  updateEvidenceStatus(id: string, status: IngestionStatus, actor = "system"): EvidenceRecord | undefined {
    const rec = evidence.find((item) => item.id === id);
    if (!rec) return undefined;
    rec.ingestionStatus = status;
    pushAudit({
      workspaceId: rec.workspaceId,
      type: "evidence_status_updated",
      actor,
      payload: { evidenceId: id, status }
    });
    return rec;
  },
  deleteEvidenceRecord(id: string, actor = "system"): EvidenceRecord | undefined {
    const index = evidence.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const [removed] = evidence.splice(index, 1);
    pushAudit({
      workspaceId: removed.workspaceId,
      type: "evidence_deleted",
      actor,
      payload: {
        evidenceId: id,
        sourcePath: removed.sourcePath,
        department: removed.department ?? null,
        ingestionStatus: removed.ingestionStatus
      }
    });
    return removed;
  },
  byRoleSummary(role: string) {
    const relevantEvidence = evidence.filter((item) => item.ingestionStatus === "processed");
    const recs = recommendations.filter((item) => item.status !== "rejected");
    const topMap: Record<string, string> = {
      ceo: "Strategic risk and decision velocity",
      coo: "Execution bottlenecks and operational throughput",
      cbo: "Growth opportunities and partner pipeline",
      cto: "Technology health, data governance, and security posture"
    };
    return {
      role,
      topFocus: topMap[role] ?? "Specialist evidence brief and next-best action",
      evidenceCount: relevantEvidence.length,
      recommendationCount: recs.length,
      quarantinedCount: evidence.filter((item) => item.ingestionStatus === "quarantined").length
    };
  },
  checkSlackSafety(text: string, refs: string[]): { safe: boolean; reason?: string } {
    const linkedSensitivity: Sensitivity[] = refs
      .map((id) => store.getEvidenceById(id)?.sensitivity)
      .filter((item): item is Sensitivity => Boolean(item));

    if (linkedSensitivity.includes("restricted")) {
      return { safe: false, reason: "restricted_evidence_linked" };
    }

    if (/ssn|passport|secret|credential|api key/i.test(text)) {
      return { safe: false, reason: "sensitive_pattern_detected" };
    }

    return { safe: true };
  },

  // -------------------------------------------------------------------------
  // Agent key management (in-memory fallback)
  // -------------------------------------------------------------------------

  addAgentKey(key: StoredAgentKey): void {
    agentKeyStore.push(key);
  },

  listAgentKeys(workspaceId: string): AgentKey[] {
    return agentKeyStore
      .filter((k) => k.workspaceId === workspaceId)
      .map(({ keyHash: _kh, ...rest }) => rest);
  },

  revokeAgentKey(id: string): boolean {
    const key = agentKeyStore.find((k) => k.id === id);
    if (!key) return false;
    key.active = false;
    return true;
  },

  verifyAgentKey(rawSecret: string, workspaceId: string): AgentKey | null {
    const { createHmac } = require("crypto");
    const keyHash = createHmac("sha256", process.env.AUTH_SECRET ?? "nexus-dev-secret")
      .update(rawSecret)
      .digest("hex");
    const found = agentKeyStore.find(
      (k) => k.keyHash === keyHash && k.workspaceId === workspaceId && k.active
    );
    if (!found) return null;
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) return null;
    const { keyHash: _kh, ...rest } = found;
    return rest;
  },

  // -------------------------------------------------------------------------
  // Strategy profile (in-memory fallback)
  // -------------------------------------------------------------------------

  getStrategyProfile(workspaceId: string): StrategyProfile | null {
    return strategyProfileStore.get(workspaceId) ?? null;
  },

  upsertStrategyProfile(profile: StrategyProfile): StrategyProfile {
    const record = { ...profile, updatedAt: nowIso() };
    strategyProfileStore.set(profile.workspaceId, record);
    return record;
  },

  setPilotReadiness(
    workspaceId: string,
    pilotReady: boolean,
    pilotGates: StrategyProfile["pilotGates"]
  ): StrategyProfile {
    const existing = strategyProfileStore.get(workspaceId);
    const now = nowIso();
    const profile: StrategyProfile = {
      id: existing?.id ?? `sp_${workspaceId}`,
      workspaceId,
      buyerLane: existing?.buyerLane ?? "evaluator",
      role: existing?.role ?? null,
      sector: existing?.sector ?? null,
      companySize: existing?.companySize ?? null,
      priority: existing?.priority ?? "medium",
      sponsorName: existing?.sponsorName ?? null,
      sponsorEmail: existing?.sponsorEmail ?? null,
      reviewerName: existing?.reviewerName ?? null,
      reviewerEmail: existing?.reviewerEmail ?? null,
      governancePosture: existing?.governancePosture ?? "standard",
      selectedWorkflow: existing?.selectedWorkflow ?? null,
      readinessScores: existing?.readinessScores ?? {},
      readinessBand: existing?.readinessBand ?? null,
      externalRef: existing?.externalRef ?? null,
      initialLane: existing?.initialLane ?? null,
      laneChangeReason: existing?.laneChangeReason ?? null,
      laneConfidence: existing?.laneConfidence ?? null,
      laneChangedBy: existing?.laneChangedBy ?? null,
      laneChangedAt: existing?.laneChangedAt ?? null,
      pilotReady,
      pilotGates,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    strategyProfileStore.set(workspaceId, profile);
    return profile;
  },

  // -------------------------------------------------------------------------
  // Reviewer seats (in-memory fallback, migration 0035)
  // -------------------------------------------------------------------------

  createReviewerSeat(seat: ReviewerSeat, inviteCodeHash: string): ReviewerSeat {
    reviewerSeatStore.set(seat.id, { ...seat, inviteCodeHash });
    return seat;
  },

  /** Atomic-equivalent single-use accept: invited, unexpired, code matches. */
  acceptReviewerSeat(
    inviteCodeHash: string,
    clerkUserId: string,
    now = new Date()
  ): ReviewerSeat | null {
    for (const seat of reviewerSeatStore.values()) {
      if (
        seat.inviteCodeHash === inviteCodeHash &&
        seat.status === "invited" &&
        new Date(seat.expiresAt) > now
      ) {
        const accepted: StoredReviewerSeat = {
          ...seat,
          status: "accepted",
          clerkUserId,
          acceptedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        reviewerSeatStore.set(seat.id, accepted);
        return publicReviewerSeat(accepted);
      }
    }
    return null;
  },

  getAcceptedReviewerSeat(workspaceId: string): ReviewerSeat | null {
    for (const seat of reviewerSeatStore.values()) {
      if (seat.workspaceId === workspaceId && seat.status === "accepted") {
        return publicReviewerSeat(seat);
      }
    }
    return null;
  },

  listReviewerSeats(workspaceId: string): ReviewerSeat[] {
    return [...reviewerSeatStore.values()]
      .filter((seat) => seat.workspaceId === workspaceId)
      .map(publicReviewerSeat);
  },

  revokeReviewerSeat(workspaceId: string, seatId: string, now = new Date()): ReviewerSeat | null {
    const seat = reviewerSeatStore.get(seatId);
    if (!seat || seat.workspaceId !== workspaceId || seat.status === "revoked") return null;
    const revoked: StoredReviewerSeat = {
      ...seat,
      status: "revoked",
      revokedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    reviewerSeatStore.set(seatId, revoked);
    return publicReviewerSeat(revoked);
  },

  // -------------------------------------------------------------------------
  // Pilot outcomes (in-memory fallback)
  // -------------------------------------------------------------------------

  getPilotOutcome(workspaceId: string, workflowName: string): PilotOutcome | null {
    return pilotOutcomeStore.get(pilotOutcomeKey(workspaceId, workflowName)) ?? null;
  },

  recordPilotDecision(input: {
    id: string;
    workspaceId: string;
    workflowName: string;
    status: PilotOutcome["status"];
    note?: string | null;
    decidedBy: string;
    now?: Date;
  }): PilotOutcome {
    const now = (input.now ?? new Date()).toISOString();
    const key = pilotOutcomeKey(input.workspaceId, input.workflowName);
    const existing = pilotOutcomeStore.get(key);
    const outcome: PilotOutcome = {
      id: existing?.id ?? input.id,
      workspaceId: input.workspaceId,
      workflowName: input.workflowName,
      status: input.status,
      note: input.note ?? null,
      decidedBy: input.decidedBy,
      decidedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    pilotOutcomeStore.set(key, outcome);
    return outcome;
  },

  // -------------------------------------------------------------------------
  // Workspace settings (in-memory fallback)
  // -------------------------------------------------------------------------

  getWorkspaceSettings(workspaceId: string): WorkspaceSettings {
    return (
      workspaceSettingsStore.get(workspaceId) ?? {
        workspaceId,
        name: workspaceId,
        timezone: "UTC",
        llmProvider: "anthropic",
        llmModel: "claude-opus-4-6",
        quarantineThreshold: 0.55,
        defaultSensitivity: "internal",
        slackEnabled: false,
        teamsEnabled: false,
        allowedProviders: ["anthropic", "deepseek", "openai_compatible"],
        localOnlyMode: false,
        sensitivityCeiling: "confidential",
        approvalRequiredThreshold: 0.7,
        demoMode: false,
        updatedAt: new Date().toISOString()
      }
    );
  },

  updateWorkspaceSettings(workspaceId: string, settings: WorkspaceSettings): void {
    workspaceSettingsStore.set(workspaceId, settings);
  },

  // -------------------------------------------------------------------------
  // Connector management (in-memory fallback)
  // -------------------------------------------------------------------------

  listConnectors(workspaceId: string): ConnectorRecord[] {
    return connectorStore.filter((c) => c.workspaceId === workspaceId);
  },

  upsertConnector(record: ConnectorRecord): void {
    const idx = connectorStore.findIndex(
      (c) => c.workspaceId === record.workspaceId && c.type === record.type
    );
    if (idx >= 0) connectorStore[idx] = record;
    else connectorStore.push(record);
  },

  revokeConnector(workspaceId: string, type: string): void {
    const c = connectorStore.find(
      (c) => c.workspaceId === workspaceId && c.type === type
    );
    if (c) c.status = "revoked";
  },

  // -------------------------------------------------------------------------
  // Workspace profile (in-memory fallback)
  // -------------------------------------------------------------------------

  getWorkspaceProfile(workspaceId: string): WorkspaceProfile | null {
    return workspaceProfileStore.get(workspaceId) ?? null;
  },

  saveWorkspaceProfile(profile: WorkspaceProfile): WorkspaceProfile {
    const record = { ...profile, updatedAt: new Date().toISOString() };
    workspaceProfileStore.set(profile.workspaceId, record);
    return record;
  },

  // -------------------------------------------------------------------------
  // Learning signals (U4 in-memory fallback)
  // -------------------------------------------------------------------------

  saveLearningSignal(signal: LearningSignal): LearningSignal {
    learningSignalStore.push(signal);
    return signal;
  },

  listLearningSignals(input: {
    workspaceId: string;
    agentId?: string;
    outputId?: string;
    signalType?: string;
    since?: string;
    limit?: number;
  }): LearningSignal[] {
    const sinceTime = input.since ? new Date(input.since).getTime() : null;
    const limit = input.limit ?? 100;
    return learningSignalStore
      .filter((s) => s.workspaceId === input.workspaceId)
      .filter((s) => !input.agentId    || s.agentId    === input.agentId)
      .filter((s) => !input.outputId   || s.outputId   === input.outputId)
      .filter((s) => !input.signalType || s.signalType === input.signalType)
      .filter((s) => !sinceTime        || new Date(s.createdAt).getTime() >= sinceTime)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
};
