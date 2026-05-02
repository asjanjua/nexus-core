import {
  type AgentKey,
  type AgentScope,
  type Decision,
  type EvidenceRecord,
  type IngestionStatus,
  type Recommendation,
  type RecommendationStatus,
  type Role,
  type Sensitivity,
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

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
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
    tenantId: "tenant-demo",
    workspaceId: "workspace-demo",
    title: "Partner replication remains deferred until post-pilot",
    owner: "manager_agent",
    rationale: "Pilot must prioritize evidence and governance reliability before replication complexity.",
    status: "decided",
    evidenceRefs: ["ev-001", "ev-002"],
    decidedAt: "2026-04-30T13:30:00Z"
  }
];

const auditEvents: AuditEvent[] = [];
const conversations: ConversationStore = {};

// Agent keys in-memory store (keyed by workspaceId)
type StoredAgentKey = AgentKey & { keyHash: string };
const agentKeyStore: StoredAgentKey[] = [];

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
      updatedAt: new Date().toISOString()
    }
  ]
]);

const connectorStore: ConnectorRecord[] = [];

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
  conversations,
  getEvidenceById(id: string): EvidenceRecord | undefined {
    return evidence.find((item) => item.id === id);
  },
  getEvidenceForWorkspace(workspaceId: string): EvidenceRecord[] {
    return evidence.filter((item) => item.workspaceId === workspaceId);
  },
  getRecommendations(workspaceId: string): Recommendation[] {
    return recommendations.filter((item) => item.workspaceId === workspaceId);
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
  appendConversation(workspaceId: string, userId: string, role: "user" | "assistant", text: string): void {
    const key = `${workspaceId}:${userId}`;
    if (!conversations[key]) conversations[key] = [];
    conversations[key].push({ role, text, timestamp: nowIso() });
  },
  getConversation(workspaceId: string, userId: string): ConversationMessage[] {
    return conversations[`${workspaceId}:${userId}`] ?? [];
  },
  pushAudit,
  getAuditEvents(workspaceId: string, limit = 20): AuditEvent[] {
    return auditEvents
      .filter((e) => e.workspaceId === workspaceId)
      .slice(-limit)
      .reverse();
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
  byRoleSummary(role: Role) {
    const relevantEvidence = evidence.filter((item) => item.ingestionStatus === "processed");
    const recs = recommendations.filter((item) => item.status !== "rejected");
    const topMap: Record<Role, string> = {
      ceo: "Strategic risk and decision velocity",
      coo: "Execution bottlenecks and operational throughput",
      cbo: "Growth opportunities and partner pipeline",
      cto: "Technology health, data governance, and security posture"
    };
    return {
      role,
      topFocus: topMap[role],
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
  }
};
