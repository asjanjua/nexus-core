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
  type LearningSignal,
  type Recommendation,
  type RecommendationStatus,
  type Role,
  type Sensitivity,
  type WorkspaceProfile,
  type WorkspaceSettings
} from "@/lib/contracts";
import type { ConnectorRecord } from "@/lib/data/repository";

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
const conversations: ConversationStore = {};
const agentOutputs: AgentOutput[] = [];
const learningSignalStore: LearningSignal[] = [];
const entityStore: Entity[] = [];

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
    actionType?: string;
    since?: string;
    limit?: number;
  }): AgentOutput[] {
    const sinceTime = input.since ? new Date(input.since).getTime() : null;
    return agentOutputs
      .filter((output) => output.workspaceId === input.workspaceId)
      .filter((output) => !input.agentId || output.agentId === input.agentId)
      .filter((output) => !sinceTime || new Date(output.createdAt).getTime() >= sinceTime)
      .filter((output) => !input.actionType || input.actionType === "agent_output_created")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, input.limit ?? 50);
  },
  saveAgentOutput(input: AgentOutputInput): AgentOutput {
    const { processingMs, ...recordInput } = input;
    const prior = agentOutputs
      .filter((output) =>
        output.workspaceId === recordInput.workspaceId &&
        output.agentId === recordInput.agentId &&
        output.roleKey === recordInput.roleKey
      )
      .sort((a, b) => b.outputVersion - a.outputVersion)[0];
    const version = prior ? prior.outputVersion + 1 : 1;
    const record: AgentOutput = {
      id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...recordInput,
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
