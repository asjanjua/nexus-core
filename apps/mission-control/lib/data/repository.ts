import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { verifyPassword } from "@/lib/auth";
import { store } from "@/lib/data/store";
import { evidenceSourceTypeSchema } from "@/lib/contracts";
import type { Action, ActionInput, ActionStatus, AgentKey, AgentKeyCreated, AgentOutput, AgentOutputInput, AgentScope, ConversationMessage, Decision, DecisionInput, DecisionStatus, DispatchJob, DispatchJobInput, DispatchJobStatus, Entity, EntityInput, EntityType, EvalRunSummary, EvidenceRecord, IngestionStatus, KnowledgeLink, KnowledgeNote, KnowledgeNoteInput, KnowledgeSearchResult, KnowledgeSyncEvent, LearningSignal, LearningSignalInput, LearningSignalSummary, PromptRegistryEntry, Recommendation, RecommendationStatus, Role, StrategyProfile, StrategyProfileInput, SynthesisSchedule, SynthesisScheduleInput, SynthesisScheduleStatus, WorkflowTwin, WorkflowTwinInput, WorkflowTwinRun, WorkflowTwinRunInput, WorkflowTwinRunStatus, WorkflowTwinStatus, WorkflowTwinType, WorkspaceProfile, WorkspaceSettings } from "@/lib/contracts";
import { assertDbConfigured, isDbRequired } from "@/lib/data/db-policy";

// In-memory idempotency cache for Stripe events (fallback when DB is unavailable).
// Cleared on process restart — acceptable because Stripe only retries within 3 days
// and production deployments always have a DB wired.
const stripeProcessedEventCache = new Set<string>();
import { normalizeDatabaseUrl } from "@/lib/data/postgres-url";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";
import { buildDefaultAgentControlProfile, buildDefaultAgentControlProfiles } from "@/lib/agents/default-passports";
import type { AgentControlProfile, AgentControlProfileInput } from "@/lib/contracts";
import {
  actions,
  agentControlProfiles,
  agentOutputs,
  agentKeys,
  askConversationMessages,
  auditEvents,
  connectors,
  decisions,
  entities,
  evalRuns,
  evidenceEntityLinks,
  evidenceRecords,
  knowledgeLinks,
  knowledgeNotes,
  knowledgeSyncEvents,
  learningSignals,
  llmUsage,
  promptRegistry,
  recommendations,
  roles,
  synthesisSchedules,
  tenants,
  users,
  workspaces,
  workspaceProfiles,
  workspaceSettings,
  workflowTwinRuns,
  workflowTwins,
  planDefinitions,
  dispatchJobs,
  stripeProcessedEvents,
  strategyProfiles,
  type recommendationStatusEnum,
  type ingestionStatusEnum
} from "@/db/schema";
import { applyKnowledgeFilters, buildKnowledgeGraph, buildKnowledgeLinks, defaultKnowledgePath, extractKnowledge, searchKnowledgeNotes } from "@/lib/knowledge/markdown";
import type { KnowledgeFilterOptions } from "@/lib/knowledge/markdown";

export type WorkspaceStatus = "trial" | "pilot" | "active" | "suspended" | "cancelled";

export type WorkspaceStatusRecord = {
  status: WorkspaceStatus;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  expiresAt: string | null;
};

export type WorkspaceAccessCheck = {
  blocked: boolean;
  reason: "suspended" | "expired" | "cancelled" | null;
};

/** Pure function: given a status record, is the workspace blocked and why?
 * Kept separate from the DB read so it's trivially unit-testable. */
export function evaluateWorkspaceAccess(record: WorkspaceStatusRecord): WorkspaceAccessCheck {
  if (record.status === "cancelled") return { blocked: true, reason: "cancelled" };
  if (record.suspendedAt) return { blocked: true, reason: "suspended" };
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return { blocked: true, reason: "expired" };
  }
  return { blocked: false, reason: null };
}

export type LLMUsageInput = {
  workspaceId: string;
  model: string;
  route: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicro?: number;
};

type AuditInput = {
  workspaceId: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
};

export type ConnectorRecord = {
  id: string;
  workspaceId: string;
  type: string;
  status: string;
  installedBy: string;
  installedAt: string;
  lastSyncAt?: string;
  syncError?: string;
  config: Record<string, unknown>;
};

function toConnector(row: typeof connectors.$inferSelect): ConnectorRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    status: row.status,
    installedBy: row.installedBy,
    installedAt: row.installedAt.toISOString(),
    lastSyncAt: row.lastSyncAt?.toISOString(),
    syncError: row.syncError ?? undefined,
    config: (row.config as Record<string, unknown>) ?? {}
  };
}

function toKnowledgeNote(row: typeof knowledgeNotes.$inferSelect): KnowledgeNote {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    path: row.path,
    body: row.body,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sensitivity: row.sensitivity,
    status: row.status,
    sourceKind: row.sourceKind,
    frontmatter: row.frontmatter && typeof row.frontmatter === "object" ? row.frontmatter as Record<string, unknown> : {},
    evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
    entityRefs: Array.isArray(row.entityRefs) ? row.entityRefs : [],
    workflowRefs: Array.isArray(row.workflowRefs) ? row.workflowRefs : [],
    decisionRefs: Array.isArray(row.decisionRefs) ? row.decisionRefs : [],
    recommendationRefs: Array.isArray(row.recommendationRefs) ? row.recommendationRefs : [],
    createdBy: row.createdBy,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
  };
}

function toKnowledgeLink(row: typeof knowledgeLinks.$inferSelect): KnowledgeLink {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    sourceNoteId: row.sourceNoteId,
    targetType: row.targetType,
    targetId: row.targetId,
    label: row.label,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  };
}

function toKnowledgeSyncEvent(row: typeof knowledgeSyncEvents.$inferSelect): KnowledgeSyncEvent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    path: row.path ?? null,
    noteId: row.noteId ?? null,
    status: row.status,
    message: row.message ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  };
}

type DbShape = ReturnType<typeof drizzle>;

let dbInstance: DbShape | null | undefined;
let dbPool: Pool | null = null;

function decodeStoredPercent(value: number): number {
  return Number((value / 100).toFixed(2));
}

function encodeStoredPercent(value: number): number {
  return Math.round(value * 100);
}

function getDb(): DbShape | null {
  if (dbInstance !== undefined) return dbInstance;
  assertDbConfigured();
  const url = process.env.DATABASE_URL;
  if (!url) {
    dbInstance = null;
    return null;
  }
  dbPool = new Pool({ connectionString: normalizeDatabaseUrl(url) });
  dbInstance = drizzle(dbPool);
  return dbInstance;
}

function toEvidenceRecord(row: typeof evidenceRecords.$inferSelect): EvidenceRecord {
  const sourceTimestamp =
    typeof row.sourceTimestamp === "string" ? row.sourceTimestamp : row.sourceTimestamp.toISOString();
  const ingestedAt = typeof row.ingestedAt === "string" ? row.ingestedAt : row.ingestedAt.toISOString();
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    sourceType: evidenceSourceTypeSchema.safeParse(row.sourceType).success
      ? row.sourceType as EvidenceRecord["sourceType"]
      : "document",
    department: row.department ?? undefined,
    connectorInstanceId: row.connectorInstanceId ?? undefined,
    sourcePath: row.sourcePath,
    sourceUri: row.sourceUri ?? undefined,
    sourceTimestamp,
    ingestedAt,
    hash: row.hash,
    sensitivity: row.sensitivity,
    extractionConfidence: decodeStoredPercent(row.extractionConfidence),
    ingestionStatus: row.ingestionStatus,
    // Recompute on every read so freshness reflects actual elapsed time,
    // not the value frozen at ingest.
    freshnessHours: Math.round(
      (Date.now() - new Date(sourceTimestamp).getTime()) / (1000 * 60 * 60)
    ),
    text: row.body
  };
}

function toAgentOutput(row: typeof agentOutputs.$inferSelect): AgentOutput {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    agentId: row.agentId,
    agentVersion: row.agentVersion,
    roleKey: row.roleKey,
    department: row.department ?? null,
    content: row.content,
    inputSummary: row.inputSummary,
    evidenceRefs: (row.evidenceRefs as string[]) ?? [],
    confidence: decodeStoredPercent(row.confidence),
    outputVersion: row.outputVersion,
    isActive: row.isActive,
    replacedById: row.replacedById ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  };
}

function toSynthesisSchedule(row: typeof synthesisSchedules.$inferSelect): SynthesisSchedule {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    enabled: row.enabled,
    cron: row.cron,
    timezone: row.timezone,
    roles: Array.isArray(row.roles) ? row.roles : ["ceo"],
    delivery: Array.isArray(row.delivery) ? row.delivery as SynthesisSchedule["delivery"] : ["in_app"],
    emailTargets: Array.isArray(row.emailTargets) ? row.emailTargets : [],
    slackChannel: row.slackChannel ?? null,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastStatus: row.lastStatus as SynthesisScheduleStatus | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toWorkflowTwin(row: typeof workflowTwins.$inferSelect): WorkflowTwin {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type as WorkflowTwinType,
    name: row.name,
    status: row.status as WorkflowTwinStatus,
    config: (row.config as Record<string, unknown>) ?? {},
    owner: row.owner ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedBy: row.updatedBy ?? null,
    updatedAt: row.updatedAt.toISOString()
  };
}

function toWorkflowTwinRun(row: typeof workflowTwinRuns.$inferSelect): WorkflowTwinRun {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    twinId: row.twinId,
    twinType: row.twinType as WorkflowTwinType,
    evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
    generatedOutputRefs: Array.isArray(row.generatedOutputRefs) ? row.generatedOutputRefs : [],
    confidence: decodeStoredPercent(row.confidence),
    status: row.status as WorkflowTwinRunStatus,
    summary: row.summary,
    payload: (row.payload as Record<string, unknown>) ?? {},
    runAt: row.runAt.toISOString(),
    reviewedBy: row.reviewedBy ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null
  };
}

function toRecommendation(row: typeof recommendations.$inferSelect): Recommendation {
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString();
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString();
  return {
    id: row.id,
    tenantId: row.workspaceId.replace("workspace-", "tenant-"),
    workspaceId: row.workspaceId,
    title: row.title,
    owner: row.owner,
    status: row.status,
    confidence: decodeStoredPercent(row.confidence),
    affectedEntityIds: Array.isArray(row.affectedEntityIds) ? (row.affectedEntityIds as string[]) : [],
    evidenceRefs: Array.isArray(row.evidenceRefs) ? (row.evidenceRefs as string[]) : [],
    createdAt,
    updatedAt
  };
}

function toWorkspaceProfile(row: typeof workspaceProfiles.$inferSelect): WorkspaceProfile {
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString();
  return {
    workspaceId: row.workspaceId,
    companyName: row.companyName ?? null,
    sector: row.sector ?? null,
    subsector: row.subsector ?? null,
    businessModel: row.businessModel ?? null,
    companyStage: (row.companyStage as WorkspaceProfile["companyStage"]) ?? null,
    employeeBand: (row.employeeBand as WorkspaceProfile["employeeBand"]) ?? null,
    region: row.region ?? null,
    primaryGoals: Array.isArray(row.primaryGoals) ? (row.primaryGoals as string[]) : [],
    riskProfile: (row.riskProfile as WorkspaceProfile["riskProfile"]) ?? null,
    priorityRoles: Array.isArray(row.priorityRoles) ? (row.priorityRoles as string[]) : [],
    companyArchetype: (row.companyArchetype as WorkspaceProfile["companyArchetype"]) ?? null,
    archetypeVersion: row.archetypeVersion ?? null,
    briefLanguageMode: (row.briefLanguageMode as WorkspaceProfile["briefLanguageMode"]) ?? "formal",
    locationCount: row.locationCount ?? 1,
    roleStates: row.roleStates && typeof row.roleStates === "object"
      ? (row.roleStates as WorkspaceProfile["roleStates"])
      : {},
    updatedAt
  };
}

function toAgentControlProfile(row: typeof agentControlProfiles.$inferSelect): AgentControlProfile {
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt);
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    agentKey: row.agentKey,
    name: row.name,
    purpose: row.purpose,
    version: row.version,
    status: row.status,
    allowedScopes: Array.isArray(row.allowedScopes) ? row.allowedScopes : [],
    forbiddenScopes: Array.isArray(row.forbiddenScopes) ? row.forbiddenScopes : [],
    maxSensitivity: row.maxSensitivity,
    crossEntityAccess: row.crossEntityAccess,
    allowedTools: Array.isArray(row.allowedTools) ? row.allowedTools : [],
    forbiddenTools: Array.isArray(row.forbiddenTools) ? row.forbiddenTools : [],
    policyControlledApis: row.policyControlledApis && typeof row.policyControlledApis === "object"
      ? row.policyControlledApis as Record<string, unknown>
      : {},
    actionRight: row.actionRight,
    hardStops: Array.isArray(row.hardStops) ? row.hardStops : [],
    escalationTriggers: Array.isArray(row.escalationTriggers) ? row.escalationTriggers : [],
    approvalLevel: row.approvalLevel,
    riskRating: row.riskRating,
    reviewCadence: row.reviewCadence,
    watcherAgents: Array.isArray(row.watcherAgents) ? row.watcherAgents : [],
    logLevel: row.logLevel,
    createdBy: row.createdBy,
    createdAt,
    updatedBy: row.updatedBy,
    updatedAt
  };
}

async function runDb<T>(runner: (db: DbShape) => Promise<T>): Promise<T | null> {
  const db = getDb();
  if (!db) {
    if (isDbRequired()) throw new Error("Database is required but unavailable.");
    return null;
  }
  try {
    return await runner(db);
  } catch (error) {
    if (isDbRequired()) throw error;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dispatch job helpers
// ---------------------------------------------------------------------------

/** Exponential backoff: 30s, 5m, 30m for attempts 1, 2, 3+ */
function backoffMs(attempts: number): number {
  const schedule = [30_000, 5 * 60_000, 30 * 60_000];
  return schedule[Math.min(attempts - 1, schedule.length - 1)] ?? 30_000;
}

type DispatchJobRow = typeof dispatchJobs.$inferSelect;

function mapDispatchJob(row: DispatchJobRow): DispatchJob {
  return {
    id:          row.id,
    workspaceId: row.workspaceId,
    jobType:     row.jobType as DispatchJob["jobType"],
    payload:     (row.payload ?? {}) as Record<string, unknown>,
    status:      row.status as DispatchJob["status"],
    priority:    row.priority,
    attempts:    row.attempts,
    maxAttempts: row.maxAttempts,
    runAfter:    row.runAfter instanceof Date ? row.runAfter.toISOString() : String(row.runAfter),
    startedAt:   row.startedAt instanceof Date ? row.startedAt.toISOString() : (row.startedAt ?? null),
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : (row.completedAt ?? null),
    error:       row.error ?? null,
    parentJobId: row.parentJobId ?? null,
    createdAt:   row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

function mapDispatchJobRaw(row: Record<string, unknown>): DispatchJob {
  const toIso = (v: unknown) => v instanceof Date ? v.toISOString() : (v ? String(v) : null);
  return {
    id:          String(row.id),
    workspaceId: String(row.workspace_id),
    jobType:     String(row.job_type) as DispatchJob["jobType"],
    payload:     (row.payload ?? {}) as Record<string, unknown>,
    status:      String(row.status) as DispatchJob["status"],
    priority:    Number(row.priority),
    attempts:    Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    runAfter:    toIso(row.run_after) ?? new Date().toISOString(),
    startedAt:   toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    error:       row.error ? String(row.error) : null,
    parentJobId: row.parent_job_id ? String(row.parent_job_id) : null,
    createdAt:   toIso(row.created_at) ?? new Date().toISOString(),
  };
}

export const repository = {
  async healthCheck(): Promise<{ ok: boolean; usingDatabase: boolean; reason?: string }> {
    const db = getDb();
    if (!db) {
      if (isDbRequired()) return { ok: false, usingDatabase: false, reason: "database_required_unavailable" };
      return { ok: true, usingDatabase: false };
    }
    try {
      await db.execute(sql`select 1`);
      return { ok: true, usingDatabase: true };
    } catch (error) {
      if (isDbRequired()) {
        return {
          ok: false,
          usingDatabase: true,
          reason: error instanceof Error ? error.message : "db_health_check_failed"
        };
      }
      return { ok: true, usingDatabase: false, reason: "falling_back_to_memory_store" };
    }
  },

  async authenticateUser(
    identifier: string,
    password: string,
    workspaceId: string
  ): Promise<{ userId: string; workspaceId: string } | null> {
    const rows = await runDb((db) =>
      db
        .select({
          id: users.id,
          email: users.email,
          hash: users.passwordHash,
          salt: users.passwordSalt,
          active: users.active
        })
        .from(users)
        .innerJoin(roles, eq(roles.userId, users.id))
        .where(
          sql`${roles.workspaceId} = ${workspaceId}
            AND ${users.active} = true
            AND (${users.id} = ${identifier} OR ${users.email} = ${identifier})`
        )
        .limit(1)
    );

    if (!rows || !rows.length) return null;
    const user = rows[0];
    if (!user.hash || !user.salt) return null;
    if (!verifyPassword(password, user.salt, user.hash)) return null;
    return { userId: user.id, workspaceId };
  },

  async getEvidenceForWorkspace(workspaceId: string): Promise<EvidenceRecord[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(evidenceRecords)
        .where(eq(evidenceRecords.workspaceId, workspaceId))
        .orderBy(desc(evidenceRecords.ingestedAt))
    );
    if (!rows) return store.getEvidenceForWorkspace(workspaceId);
    return rows.map(toEvidenceRecord);
  },

  async getEvidenceById(id: string): Promise<EvidenceRecord | undefined> {
    const rows = await runDb((db) => db.select().from(evidenceRecords).where(eq(evidenceRecords.id, id)).limit(1));
    if (!rows) return store.getEvidenceById(id);
    return rows[0] ? toEvidenceRecord(rows[0]) : undefined;
  },

  async addEvidenceRecord(record: EvidenceRecord): Promise<EvidenceRecord> {
    const inserted = await runDb(async (db) => {
      await db.insert(evidenceRecords).values({
        id: record.id,
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        sourceType: record.sourceType,
        department: record.department,
        connectorInstanceId: record.connectorInstanceId ?? null,
        sourcePath: record.sourcePath,
        sourceUri: record.sourceUri ?? null,
        sourceTimestamp: new Date(record.sourceTimestamp),
        hash: record.hash,
        sensitivity: record.sensitivity,
        extractionConfidence: encodeStoredPercent(record.extractionConfidence),
        ingestionStatus: record.ingestionStatus,
        freshnessHours: record.freshnessHours,
        body: record.text
      });
      return true;
    });
    if (!inserted) return store.addEvidenceRecord(record);
    return record;
  },

  async listEntities(
    workspaceId: string,
    options: { type?: EntityType; query?: string; limit?: number } = {}
  ): Promise<Entity[]> {
    const limit = Math.min(250, Math.max(1, options.limit ?? 100));
    const rows = await runDb((db) =>
      db
        .select({
          id: entities.id,
          workspaceId: entities.workspaceId,
          type: entities.type,
          name: entities.name,
          metadata: entities.metadata,
          evidenceRefs: sql<string[]>`COALESCE(array_agg(DISTINCT ${evidenceEntityLinks.evidenceId}) FILTER (WHERE ${evidenceEntityLinks.evidenceId} IS NOT NULL), ARRAY[]::text[])`,
          confidence: sql<number>`COALESCE(MAX(${evidenceEntityLinks.confidence}), 70)`
        })
        .from(entities)
        .leftJoin(evidenceEntityLinks, eq(evidenceEntityLinks.entityId, entities.id))
        .where(
          sql`${entities.workspaceId} = ${workspaceId}
            ${options.type ? sql`AND ${entities.type} = ${options.type}` : sql``}
            ${options.query ? sql`AND lower(${entities.name}) LIKE ${`%${options.query.toLowerCase()}%`}` : sql``}`
        )
        .groupBy(entities.id)
        .orderBy(desc(sql<number>`COALESCE(MAX(${evidenceEntityLinks.confidence}), 70)`))
        .limit(limit)
    );
    if (!rows) return store.listEntities(workspaceId, options);
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      type: row.type as EntityType,
      name: row.name,
      metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
      evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
      confidence: decodeStoredPercent(Number(row.confidence ?? 70))
    }));
  },

  async upsertEntity(input: EntityInput): Promise<Entity> {
    const normalizedName = input.name.trim().replace(/\s+/g, " ");
    const saved = await runDb(async (db) => {
      const existing = await db
        .select()
        .from(entities)
        .where(
          sql`${entities.workspaceId} = ${input.workspaceId}
            AND ${entities.type} = ${input.type}
            AND lower(${entities.name}) = ${normalizedName.toLowerCase()}`
        )
        .limit(1);

      const entityId =
        existing[0]?.id ?? `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      if (existing[0]) {
        await db
          .update(entities)
          .set({
            metadata: {
              ...((existing[0].metadata as Record<string, unknown>) ?? {}),
              ...input.metadata
            }
          })
          .where(eq(entities.id, entityId));
      } else {
        await db.insert(entities).values({
          id: entityId,
          workspaceId: input.workspaceId,
          type: input.type,
          name: normalizedName,
          metadata: input.metadata
        });
      }

      const confidence = encodeStoredPercent(input.confidence);
      await db
        .insert(evidenceEntityLinks)
        .values({
          id: `eel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          workspaceId: input.workspaceId,
          evidenceId: input.evidenceId,
          entityId,
          confidence
        })
        .onConflictDoNothing();

      return {
        id: entityId,
        workspaceId: input.workspaceId,
        type: input.type,
        name: normalizedName,
        metadata: input.metadata,
        evidenceRefs: [input.evidenceId],
        confidence: input.confidence
      } satisfies Entity;
    });
    if (saved) return saved;
    return store.upsertEntity({ ...input, name: normalizedName });
  },

  async upsertEntities(inputs: EntityInput[], actor = "entity_extractor"): Promise<Entity[]> {
    const deduped = new Map<string, EntityInput>();
    for (const input of inputs) {
      const key = `${input.workspaceId}:${input.evidenceId}:${input.type}:${input.name.trim().toLowerCase()}`;
      if (!deduped.has(key)) deduped.set(key, input);
    }
    const saved = await Promise.all(Array.from(deduped.values()).map((input) => repository.upsertEntity(input)));
    if (saved.length) {
      const workspaceId = saved[0].workspaceId;
      const evidenceIds = Array.from(new Set(inputs.map((input) => input.evidenceId)));
      await repository.pushAudit({
        workspaceId,
        type: "entities_extracted",
        actor,
        payload: {
          count: saved.length,
          evidenceIds,
          entityTypes: Array.from(new Set(saved.map((entity) => entity.type)))
        }
      });
    }
    return saved;
  },

  async listKnowledgeNotes(
    workspaceId: string,
    options: { query?: string; limit?: number } & KnowledgeFilterOptions = {}
  ): Promise<KnowledgeNote[]> {
    const limit = Math.min(500, Math.max(1, options.limit ?? 100));
    const hasStructuralFilters = Boolean(
      options.tags?.length || options.sourceKinds?.length || options.entityId || options.workflowId ||
        (options.refType && options.refType !== "any") || (options.freshness && options.freshness !== "all")
    );
    // When structural filters are active, pull the full 500-row pool before filtering and
    // re-limiting, so the limit applies to the post-filter result set rather than truncating
    // candidates before the filter ever runs.
    const fetchLimit = hasStructuralFilters ? 500 : limit;
    const rows = await runDb((db) =>
      db
        .select()
        .from(knowledgeNotes)
        .where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND ${knowledgeNotes.status} <> 'deleted'`)
        .orderBy(desc(knowledgeNotes.updatedAt))
        .limit(fetchLimit)
    );
    if (!rows) return store.listKnowledgeNotes(workspaceId, options);
    let notes = rows.map(toKnowledgeNote);
    if (options.query) notes = searchKnowledgeNotes(notes, options.query, fetchLimit).map((result) => result.note);
    notes = applyKnowledgeFilters(notes, options);
    return notes.slice(0, limit);
  },

  async getKnowledgeNote(workspaceId: string, id: string): Promise<KnowledgeNote | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(knowledgeNotes)
        .where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND ${knowledgeNotes.id} = ${id} AND ${knowledgeNotes.status} <> 'deleted'`)
        .limit(1)
    );
    if (!rows) return store.getKnowledgeNote(workspaceId, id);
    return rows[0] ? toKnowledgeNote(rows[0]) : null;
  },

  async getKnowledgeNoteByPath(workspaceId: string, path: string): Promise<KnowledgeNote | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(knowledgeNotes)
        .where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND lower(${knowledgeNotes.path}) = ${path.toLowerCase()} AND ${knowledgeNotes.status} <> 'deleted'`)
        .limit(1)
    );
    if (!rows) return store.getKnowledgeNoteByPath(workspaceId, path);
    return rows[0] ? toKnowledgeNote(rows[0]) : null;
  },

  async upsertKnowledgeNote(workspaceId: string, input: KnowledgeNoteInput, actor: string, id?: string): Promise<KnowledgeNote> {
    const now = new Date();
    const path = input.path ?? defaultKnowledgePath(input.title);
    const extracted = extractKnowledge(input.body, input.frontmatter);
    const tags = Array.from(new Set([...(input.tags ?? []), ...extracted.tags]));
    const evidenceRefs = Array.from(new Set([...(input.evidenceRefs ?? []), ...extracted.evidenceRefs]));
    const entityRefs = Array.from(new Set([...(input.entityRefs ?? []), ...extracted.entityRefs]));
    const workflowRefs = Array.from(new Set([...(input.workflowRefs ?? []), ...extracted.workflowRefs]));
    const decisionRefs = Array.from(new Set([...(input.decisionRefs ?? []), ...extracted.decisionRefs]));
    const recommendationRefs = Array.from(new Set([...(input.recommendationRefs ?? []), ...extracted.recommendationRefs]));
    const noteId = id ?? `kn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const saved = await runDb(async (db) => {
      const existing = id
        ? await db.select().from(knowledgeNotes).where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND ${knowledgeNotes.id} = ${id}`).limit(1)
        : await db.select().from(knowledgeNotes).where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND lower(${knowledgeNotes.path}) = ${path.toLowerCase()}`).limit(1);
      const existingRow = existing[0];
      const finalId = existingRow?.id ?? noteId;
      const values = {
        id: finalId,
        workspaceId,
        title: input.title,
        path,
        body: input.body,
        tags,
        sensitivity: input.sensitivity,
        status: input.status,
        sourceKind: input.sourceKind,
        frontmatter: input.frontmatter,
        evidenceRefs,
        entityRefs,
        workflowRefs,
        decisionRefs,
        recommendationRefs,
        createdBy: existingRow?.createdBy ?? actor,
        updatedBy: actor,
        createdAt: existingRow?.createdAt ?? now,
        updatedAt: now
      };

      let row: typeof knowledgeNotes.$inferSelect | undefined;
      if (existingRow) {
        [row] = await db
          .update(knowledgeNotes)
          .set({
            title: values.title,
            path: values.path,
            body: values.body,
            tags: values.tags,
            sensitivity: values.sensitivity,
            status: values.status,
            sourceKind: values.sourceKind,
            frontmatter: values.frontmatter,
            evidenceRefs: values.evidenceRefs,
            entityRefs: values.entityRefs,
            workflowRefs: values.workflowRefs,
            decisionRefs: values.decisionRefs,
            recommendationRefs: values.recommendationRefs,
            updatedBy: actor,
            updatedAt: now
          })
          .where(eq(knowledgeNotes.id, finalId))
          .returning();
      } else {
        [row] = await db.insert(knowledgeNotes).values(values).returning();
      }

      const note = row ? toKnowledgeNote(row) : null;
      if (!note) return null;
      await db.delete(knowledgeLinks).where(sql`${knowledgeLinks.workspaceId} = ${workspaceId} AND ${knowledgeLinks.sourceNoteId} = ${note.id}`);
      const links = buildKnowledgeLinks(note);
      if (links.length) {
        await db.insert(knowledgeLinks).values(
          links.map((link, index) => ({
            id: `kl-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            workspaceId,
            sourceNoteId: note.id,
            targetType: link.targetType,
            targetId: link.targetId,
            label: link.label,
            createdAt: now
          }))
        );
      }
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: existingRow ? "knowledge_note_updated" : "knowledge_note_created",
        actor,
        payload: { noteId: note.id, path: note.path, sourceKind: note.sourceKind },
        createdAt: now
      });
      return note;
    });

    if (saved) return saved;
    const note = store.upsertKnowledgeNote(workspaceId, { ...input, path }, actor, id);
    store.pushAudit({
      workspaceId,
      type: id ? "knowledge_note_updated" : "knowledge_note_created",
      actor,
      payload: { noteId: note.id, path: note.path, sourceKind: note.sourceKind }
    });
    return note;
  },

  async deleteKnowledgeNote(workspaceId: string, id: string, actor: string): Promise<boolean> {
    const deleted = await runDb(async (db) => {
      const rows = await db
        .update(knowledgeNotes)
        .set({ status: "deleted", updatedBy: actor, updatedAt: new Date() })
        .where(sql`${knowledgeNotes.workspaceId} = ${workspaceId} AND ${knowledgeNotes.id} = ${id}`)
        .returning();
      await db.delete(knowledgeLinks).where(sql`${knowledgeLinks.workspaceId} = ${workspaceId} AND ${knowledgeLinks.sourceNoteId} = ${id}`);
      return rows.length > 0;
    });
    if (deleted !== null) return deleted;
    return store.deleteKnowledgeNote(workspaceId, id, actor);
  },

  async listKnowledgeLinks(workspaceId: string, sourceNoteId?: string): Promise<KnowledgeLink[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(knowledgeLinks)
        .where(sql`${knowledgeLinks.workspaceId} = ${workspaceId} ${sourceNoteId ? sql`AND ${knowledgeLinks.sourceNoteId} = ${sourceNoteId}` : sql``}`)
    );
    if (!rows) return store.listKnowledgeLinks(workspaceId, sourceNoteId);
    return rows.map(toKnowledgeLink);
  },

  async searchKnowledge(workspaceId: string, query: string, limit = 20): Promise<KnowledgeSearchResult[]> {
    const notes = await repository.listKnowledgeNotes(workspaceId, { limit: 500 });
    return searchKnowledgeNotes(notes, query, limit);
  },

  async getKnowledgeGraph(workspaceId: string, filters: KnowledgeFilterOptions = {}) {
    const [notes, links] = await Promise.all([
      repository.listKnowledgeNotes(workspaceId, { limit: 500, ...filters }),
      repository.listKnowledgeLinks(workspaceId)
    ]);
    // Keep the graph's edges consistent with the filtered note set — an edge whose source
    // note was filtered out would otherwise dangle (point at a node that doesn't exist).
    const noteIds = new Set(notes.map((note) => note.id));
    const filteredLinks = links.filter((link) => noteIds.has(link.sourceNoteId));
    return buildKnowledgeGraph(notes, filteredLinks);
  },

  async recordKnowledgeSyncEvent(input: Omit<KnowledgeSyncEvent, "id" | "createdAt">): Promise<KnowledgeSyncEvent> {
    const now = new Date();
    const saved = await runDb(async (db) => {
      const [row] = await db
        .insert(knowledgeSyncEvents)
        .values({
          id: `kse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          workspaceId: input.workspaceId,
          type: input.type,
          path: input.path ?? null,
          noteId: input.noteId ?? null,
          status: input.status,
          message: input.message ?? null,
          createdAt: now
        })
        .returning();
      return toKnowledgeSyncEvent(row);
    });
    if (saved) return saved;
    return store.recordKnowledgeSyncEvent(input);
  },

  async listKnowledgeSyncEvents(workspaceId: string, limit = 20): Promise<KnowledgeSyncEvent[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(knowledgeSyncEvents)
        .where(eq(knowledgeSyncEvents.workspaceId, workspaceId))
        .orderBy(desc(knowledgeSyncEvents.createdAt))
        .limit(limit)
    );
    if (!rows) return store.listKnowledgeSyncEvents(workspaceId, limit);
    return rows.map(toKnowledgeSyncEvent);
  },

  async addRecommendation(rec: Omit<Recommendation, "createdAt" | "updatedAt">): Promise<Recommendation> {
    const now = new Date().toISOString();
    const full: Recommendation = { ...rec, createdAt: now, updatedAt: now };
    const inserted = await runDb(async (db) => {
      await db.insert(recommendations).values({
        id: rec.id,
        workspaceId: rec.workspaceId,
        title: rec.title,
        owner: rec.owner,
        status: rec.status as (typeof recommendationStatusEnum.enumValues)[number],
        confidence: encodeStoredPercent(rec.confidence),
        evidenceRefs: rec.evidenceRefs,
        affectedEntityIds: rec.affectedEntityIds,
      });
      return true;
    });
    if (!inserted) return store.addRecommendation?.(full) ?? full;
    return full;
  },

  async getRecommendations(workspaceId: string): Promise<Recommendation[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(recommendations)
        .where(eq(recommendations.workspaceId, workspaceId))
        .orderBy(desc(recommendations.updatedAt))
    );
    if (!rows) return store.getRecommendations(workspaceId);
    return rows.map(toRecommendation);
  },

  async updateRecommendationStatus(
    id: string,
    status: RecommendationStatus,
    actor = "system"
  ): Promise<Recommendation | undefined> {
    const updated = await runDb(async (db) => {
      const rows = await db
        .update(recommendations)
        .set({ status: status as (typeof recommendationStatusEnum.enumValues)[number], updatedAt: new Date() })
        .where(eq(recommendations.id, id))
        .returning();
      if (!rows.length) return undefined;
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: rows[0].workspaceId,
        type: "recommendation_status_updated",
        actor,
        payload: { recommendationId: id, status }
      });
      return toRecommendation(rows[0]);
    });
    if (!updated) return store.updateRecommendationStatus(id, status, actor);
    return updated;
  },

  async updateRecommendationStatusForWorkspace(
    workspaceId: string,
    id: string,
    status: RecommendationStatus,
    actor = "system"
  ): Promise<Recommendation | undefined> {
    const updated = await runDb(async (db) => {
      const rows = await db
        .update(recommendations)
        .set({ status: status as (typeof recommendationStatusEnum.enumValues)[number], updatedAt: new Date() })
        .where(and(eq(recommendations.id, id), eq(recommendations.workspaceId, workspaceId)))
        .returning();
      if (!rows.length) return undefined;
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "recommendation_status_updated",
        actor,
        payload: { recommendationId: id, status }
      });
      return toRecommendation(rows[0]);
    });
    if (updated !== null) return updated;

    const rec = store.getRecommendations(workspaceId).find((item) => item.id === id);
    if (!rec) return undefined;
    return store.updateRecommendationStatus(id, status, actor);
  },

  async getRoleSummary(role: string): Promise<{
    role: string;
    topFocus: string;
    evidenceCount: number;
    recommendationCount: number;
    quarantinedCount: number;
  }> {
    const db = getDb();
    if (!db) return store.byRoleSummary(role);
    try {
      const [evCount, recCount, qCount] = await Promise.all([
        db
          .select({ value: sql<number>`count(*)` })
          .from(evidenceRecords)
          .where(eq(evidenceRecords.ingestionStatus, "processed")),
        db
          .select({ value: sql<number>`count(*)` })
          .from(recommendations)
          .where(sql`${recommendations.status} <> 'rejected'`),
        db
          .select({ value: sql<number>`count(*)` })
          .from(evidenceRecords)
          .where(eq(evidenceRecords.ingestionStatus, "quarantined"))
      ]);
      const top =
        role === "ceo"
          ? "Strategic risk and decision velocity"
          : role === "coo"
            ? "Execution bottlenecks and operational throughput"
            : role === "cto"
              ? "Technology health, data governance, and security posture"
              : role === "cbo"
                ? "Growth opportunities and partner pipeline"
                : "Specialist evidence brief and next-best action";
      return {
        role,
        topFocus: top,
        evidenceCount: Number(evCount[0]?.value ?? 0),
        recommendationCount: Number(recCount[0]?.value ?? 0),
        quarantinedCount: Number(qCount[0]?.value ?? 0)
      };
    } catch {
      return store.byRoleSummary(role);
    }
  },

  /**
   * Update the ingestionStatus of a single evidence record.
   * Used by the approval screen to approve (→ "processed") or reject (→ "quarantined").
   * Returns the updated record, or undefined if not found.
   */
  async updateEvidenceStatus(
    id: string,
    status: IngestionStatus,
    actor = "system"
  ): Promise<EvidenceRecord | undefined> {
    const updated = await runDb(async (db) => {
      const rows = await db
        .update(evidenceRecords)
        .set({ ingestionStatus: status as (typeof ingestionStatusEnum.enumValues)[number] })
        .where(eq(evidenceRecords.id, id))
        .returning();
      if (!rows.length) return undefined;
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: rows[0].workspaceId,
        type: "evidence_status_updated",
        actor,
        payload: { evidenceId: id, status }
      });
      return toEvidenceRecord(rows[0]);
    });
    if (updated !== null) return updated ?? undefined;
    // In-memory fallback
    return store.updateEvidenceStatus(id, status);
  },

  async deleteEvidenceRecord(id: string, actor = "system"): Promise<EvidenceRecord | undefined> {
    const deleted = await runDb(async (db) => {
      const rows = await db
        .delete(evidenceRecords)
        .where(eq(evidenceRecords.id, id))
        .returning();
      if (!rows.length) return undefined;
      const record = toEvidenceRecord(rows[0]);
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: record.workspaceId,
        type: "evidence_deleted",
        actor,
        payload: {
          evidenceId: id,
          sourcePath: record.sourcePath,
          department: record.department ?? null,
          ingestionStatus: record.ingestionStatus
        }
      });
      return record;
    });
    if (deleted !== null) return deleted ?? undefined;
    return store.deleteEvidenceRecord(id, actor);
  },

  async getAuditEvents(workspaceId: string, limit = 20): Promise<Array<{
    id: string; workspaceId: string; type: string; actor: string; timestamp: string; payload: Record<string, unknown>;
  }>> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.workspaceId, workspaceId))
        .orderBy(desc(auditEvents.id))
        .limit(limit)
    );
    if (rows) return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      type: r.type,
      actor: r.actor,
      timestamp: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      payload: (r.payload as Record<string, unknown>) ?? {}
    }));
    return store.getAuditEvents(workspaceId, limit);
  },

  async pushAudit(event: AuditInput): Promise<void> {
    const wrote = await runDb(async (db) => {
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...event
      });
      return true;
    });
    if (!wrote) store.pushAudit(event);
  },

  async listAgentOutputs(input: {
    workspaceId: string;
    agentId?: string;
    /** undefined = don't filter by department; null = match untagged rows only. */
    department?: string | null;
    actionType?: string;
    since?: string;
    limit?: number;
  }): Promise<AgentOutput[]> {
    const limit = Math.min(100, Math.max(1, input.limit ?? 50));
    const rows = await runDb((db) =>
      db
        .select()
        .from(agentOutputs)
        .where(sql`${agentOutputs.workspaceId} = ${input.workspaceId}
          ${input.agentId ? sql`AND ${agentOutputs.agentId} = ${input.agentId}` : sql``}
          ${input.department !== undefined ? sql`AND ${agentOutputs.department} IS NOT DISTINCT FROM ${input.department}` : sql``}
          ${input.since ? sql`AND ${agentOutputs.createdAt} >= ${new Date(input.since)}` : sql``}`)
        .orderBy(desc(agentOutputs.createdAt))
        .limit(limit)
    );
    const outputs = rows ? rows.map(toAgentOutput) : store.listAgentOutputs(input);
    if (!input.actionType || input.actionType === "agent_output_created") return outputs;
    return [];
  },

  async saveAgentOutput(input: AgentOutputInput): Promise<AgentOutput> {
    const { processingMs, ...recordInput } = input;
    const id = `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const saved = await runDb(async (db) => db.transaction(async (tx) => {
      const department = recordInput.department ?? null;
      const priorRows = await tx
        .select({ outputVersion: agentOutputs.outputVersion })
        .from(agentOutputs)
        .where(sql`${agentOutputs.workspaceId} = ${recordInput.workspaceId}
          AND ${agentOutputs.agentId} = ${recordInput.agentId}
          AND ${agentOutputs.roleKey} = ${recordInput.roleKey}
          AND ${agentOutputs.department} IS NOT DISTINCT FROM ${department}`)
        .orderBy(desc(agentOutputs.outputVersion))
        .limit(1);
      const outputVersion = (priorRows[0]?.outputVersion ?? 0) + 1;

      await tx
        .update(agentOutputs)
        .set({ isActive: false, replacedById: id })
        .where(sql`${agentOutputs.workspaceId} = ${recordInput.workspaceId}
          AND ${agentOutputs.agentId} = ${recordInput.agentId}
          AND ${agentOutputs.roleKey} = ${recordInput.roleKey}
          AND ${agentOutputs.department} IS NOT DISTINCT FROM ${department}
          AND ${agentOutputs.isActive} = true`);

      const [row] = await tx
        .insert(agentOutputs)
        .values({
          id,
          workspaceId: recordInput.workspaceId,
          agentId: recordInput.agentId,
          agentVersion: recordInput.agentVersion,
          roleKey: recordInput.roleKey,
          department,
          content: recordInput.content,
          inputSummary: recordInput.inputSummary,
          evidenceRefs: recordInput.evidenceRefs,
          confidence: encodeStoredPercent(recordInput.confidence),
          outputVersion,
          isActive: true,
          replacedById: null,
          createdAt: now
        })
        .returning();

      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: recordInput.workspaceId,
        type: "agent_output_created",
        actor: recordInput.agentId,
        payload: {
          agentId: recordInput.agentId,
          agentVersion: recordInput.agentVersion,
          roleKey: recordInput.roleKey,
          outputId: id,
          outputVersion,
          inputSummary: recordInput.inputSummary,
          evidenceIdsUsed: recordInput.evidenceRefs,
          confidence: recordInput.confidence,
          processingMs: processingMs ?? null
        }
      });

      return toAgentOutput(row);
    }));
    if (saved) return saved;
    return store.saveAgentOutput(input);
  },

  async rollbackAgentOutput(
    workspaceId: string,
    outputId: string,
    actor = "system",
    reason = ""
  ): Promise<AgentOutput | null> {
    const restored = await runDb(async (db) => db.transaction(async (tx) => {
      const targetRows = await tx
        .select()
        .from(agentOutputs)
        .where(sql`${agentOutputs.workspaceId} = ${workspaceId} AND ${agentOutputs.id} = ${outputId}`)
        .limit(1);
      const target = targetRows[0];
      if (!target) return null;

      const activeRows = await tx
        .select()
        .from(agentOutputs)
        .where(sql`${agentOutputs.workspaceId} = ${workspaceId}
          AND ${agentOutputs.agentId} = ${target.agentId}
          AND ${agentOutputs.roleKey} = ${target.roleKey}
          AND ${agentOutputs.isActive} = true`)
        .limit(1);
      const active = activeRows[0];

      if (active) {
        await tx
          .update(agentOutputs)
          .set({ isActive: false, replacedById: target.id })
          .where(eq(agentOutputs.id, active.id));
      }

      const [row] = await tx
        .update(agentOutputs)
        .set({ isActive: true, replacedById: null })
        .where(eq(agentOutputs.id, target.id))
        .returning();

      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

      return toAgentOutput(row);
    }));
    if (restored !== null) return restored;
    return store.rollbackAgentOutput(workspaceId, outputId, actor, reason);
  },

  async getSynthesisSchedule(workspaceId: string): Promise<SynthesisSchedule | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(synthesisSchedules)
        .where(eq(synthesisSchedules.workspaceId, workspaceId))
        .limit(1)
    );
    if (rows) return rows[0] ? toSynthesisSchedule(rows[0]) : null;
    return store.getSynthesisSchedule(workspaceId);
  },

  async listEnabledSynthesisSchedules(): Promise<SynthesisSchedule[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(synthesisSchedules)
        .where(eq(synthesisSchedules.enabled, true))
    );
    if (rows) return rows.map(toSynthesisSchedule);
    return store.listEnabledSynthesisSchedules();
  },

  async upsertSynthesisSchedule(
    workspaceId: string,
    input: SynthesisScheduleInput,
    actor = "system"
  ): Promise<SynthesisSchedule> {
    const now = new Date();
    const id = `synth-schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const saved = await runDb(async (db) => {
      const [row] = await db
        .insert(synthesisSchedules)
        .values({
          id,
          workspaceId,
          enabled: input.enabled,
          cron: input.cron,
          timezone: input.timezone,
          roles: input.roles,
          delivery: input.delivery,
          emailTargets: input.emailTargets,
          slackChannel: input.slackChannel ?? null,
          createdAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: synthesisSchedules.workspaceId,
          set: {
            enabled: input.enabled,
            cron: input.cron,
            timezone: input.timezone,
            roles: input.roles,
            delivery: input.delivery,
            emailTargets: input.emailTargets,
            slackChannel: input.slackChannel ?? null,
            updatedAt: now
          }
        })
        .returning();

      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "synthesis_schedule_updated",
        actor,
        payload: {
          enabled: input.enabled,
          cron: input.cron,
          timezone: input.timezone,
          roles: input.roles,
          delivery: input.delivery
        }
      });

      return toSynthesisSchedule(row);
    });
    if (saved) return saved;
    return store.upsertSynthesisSchedule(workspaceId, input, actor);
  },

  async updateSynthesisScheduleLastRun(
    workspaceId: string,
    status: SynthesisScheduleStatus
  ): Promise<SynthesisSchedule | null> {
    const now = new Date();
    const updated = await runDb(async (db) => {
      const [row] = await db
        .update(synthesisSchedules)
        .set({ lastRunAt: now, lastStatus: status, updatedAt: now })
        .where(eq(synthesisSchedules.workspaceId, workspaceId))
        .returning();
      return row ? toSynthesisSchedule(row) : null;
    });
    if (updated !== null) return updated;
    return store.updateSynthesisScheduleLastRun(workspaceId, status);
  },

  // -------------------------------------------------------------------------
  // Agent Control Profiles (passports)
  // -------------------------------------------------------------------------

  async listAgentControlProfiles(workspaceId: string): Promise<AgentControlProfile[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(agentControlProfiles)
        .where(eq(agentControlProfiles.workspaceId, workspaceId))
        .orderBy(desc(agentControlProfiles.agentKey), desc(agentControlProfiles.version))
    );
    if (!rows) return store.listAgentControlProfiles(workspaceId);
    return rows.map(toAgentControlProfile);
  },

  async getAgentControlProfileHistory(workspaceId: string, agentKey: string): Promise<AgentControlProfile[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(agentControlProfiles)
        .where(sql`${agentControlProfiles.workspaceId} = ${workspaceId} AND ${agentControlProfiles.agentKey} = ${agentKey}`)
        .orderBy(desc(agentControlProfiles.version))
    );
    if (!rows) return store.getAgentControlProfileHistory(workspaceId, agentKey);
    return rows.map(toAgentControlProfile);
  },

  async getActiveAgentControlProfile(workspaceId: string, agentKey: string): Promise<AgentControlProfile | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(agentControlProfiles)
        .where(
          sql`${agentControlProfiles.workspaceId} = ${workspaceId}
            AND ${agentControlProfiles.agentKey} = ${agentKey}
            AND ${agentControlProfiles.status} = 'active'`
        )
        .orderBy(desc(agentControlProfiles.version))
        .limit(1)
    );
    if (rows && rows.length) return toAgentControlProfile(rows[0]);

    const latestRows = await runDb((db) =>
      db
        .select()
        .from(agentControlProfiles)
        .where(sql`${agentControlProfiles.workspaceId} = ${workspaceId} AND ${agentControlProfiles.agentKey} = ${agentKey}`)
        .orderBy(desc(agentControlProfiles.version))
        .limit(1)
    );
    if (latestRows && latestRows.length) return toAgentControlProfile(latestRows[0]);

    const memoryProfile = store.getActiveAgentControlProfile(workspaceId, agentKey);
    if (memoryProfile) return memoryProfile;
    const memoryHistory = store.getAgentControlProfileHistory(workspaceId, agentKey);
    if (memoryHistory.length) return memoryHistory[0];

    // Runtime safety: known agents get a generated default profile even before
    // migration/seed has run, so policy enforcement is never prompt-only.
    return buildDefaultAgentControlProfile(workspaceId, agentKey, "default_seed");
  },

  async createAgentControlProfileVersion(input: AgentControlProfileInput): Promise<AgentControlProfile> {
    const history = await repository.getAgentControlProfileHistory(input.workspaceId, input.agentKey);
    const previous = history[0];
    const version = previous ? previous.version + 1 : 1;
    const now = new Date().toISOString();
    const record: AgentControlProfile = {
      id: `acp-${input.workspaceId}-${input.agentKey}-v${version}-${Date.now().toString(36)}`,
      workspaceId: input.workspaceId,
      agentKey: input.agentKey,
      name: input.name,
      purpose: input.purpose,
      version,
      status: input.status ?? "active",
      allowedScopes: input.allowedScopes,
      forbiddenScopes: input.forbiddenScopes ?? [],
      maxSensitivity: input.maxSensitivity,
      crossEntityAccess: input.crossEntityAccess ?? false,
      allowedTools: input.allowedTools ?? [],
      forbiddenTools: input.forbiddenTools ?? [],
      policyControlledApis: input.policyControlledApis ?? {},
      actionRight: input.actionRight,
      hardStops: input.hardStops ?? [],
      escalationTriggers: input.escalationTriggers ?? [],
      approvalLevel: input.approvalLevel,
      riskRating: input.riskRating,
      reviewCadence: input.reviewCadence,
      watcherAgents: input.watcherAgents ?? [],
      logLevel: input.logLevel,
      createdBy: input.createdBy,
      createdAt: now,
      updatedBy: input.updatedBy ?? input.createdBy,
      updatedAt: now
    };

    const wrote = await runDb(async (db) => {
      await db.insert(agentControlProfiles).values({
        id: record.id,
        workspaceId: record.workspaceId,
        agentKey: record.agentKey,
        name: record.name,
        purpose: record.purpose,
        version: record.version,
        status: record.status,
        allowedScopes: record.allowedScopes,
        forbiddenScopes: record.forbiddenScopes,
        maxSensitivity: record.maxSensitivity,
        crossEntityAccess: record.crossEntityAccess,
        allowedTools: record.allowedTools,
        forbiddenTools: record.forbiddenTools,
        policyControlledApis: record.policyControlledApis,
        actionRight: record.actionRight,
        hardStops: record.hardStops,
        escalationTriggers: record.escalationTriggers,
        approvalLevel: record.approvalLevel,
        riskRating: record.riskRating,
        reviewCadence: record.reviewCadence,
        watcherAgents: record.watcherAgents,
        logLevel: record.logLevel,
        createdBy: record.createdBy,
        updatedBy: record.updatedBy,
        updatedAt: new Date()
      });
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId: record.workspaceId,
        type: "agent_control_profile_version_created",
        actor: record.createdBy,
        payload: { agentKey: record.agentKey, version: record.version, status: record.status }
      });
      return true;
    });

    if (!wrote) return store.addAgentControlProfile(record);
    return record;
  },

  async seedDefaultAgentControlProfiles(workspaceId: string, actor = "system"): Promise<AgentControlProfile[]> {
    const existing = await repository.listAgentControlProfiles(workspaceId);
    if (existing.length > 0) return existing;

    const defaults = buildDefaultAgentControlProfiles(workspaceId, actor);
    const wrote = await runDb(async (db) => {
      for (const profile of defaults) {
        await db
          .insert(agentControlProfiles)
          .values({
            id: profile.id,
            workspaceId: profile.workspaceId,
            agentKey: profile.agentKey,
            name: profile.name,
            purpose: profile.purpose,
            version: profile.version,
            status: profile.status,
            allowedScopes: profile.allowedScopes,
            forbiddenScopes: profile.forbiddenScopes,
            maxSensitivity: profile.maxSensitivity,
            crossEntityAccess: profile.crossEntityAccess,
            allowedTools: profile.allowedTools,
            forbiddenTools: profile.forbiddenTools,
            policyControlledApis: profile.policyControlledApis,
            actionRight: profile.actionRight,
            hardStops: profile.hardStops,
            escalationTriggers: profile.escalationTriggers,
            approvalLevel: profile.approvalLevel,
            riskRating: profile.riskRating,
            reviewCadence: profile.reviewCadence,
            watcherAgents: profile.watcherAgents,
            logLevel: profile.logLevel,
            createdBy: profile.createdBy,
            updatedBy: profile.updatedBy,
            updatedAt: new Date(profile.updatedAt)
          })
          .onConflictDoNothing();
      }
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "agent_control_profiles_seeded",
        actor,
        payload: { count: defaults.length }
      });
      return true;
    });

    if (!wrote) {
      for (const profile of defaults) store.addAgentControlProfile(profile);
    }
    return defaults;
  },

  async suspendAgentControlProfile(workspaceId: string, agentKey: string, actor = "system"): Promise<boolean> {
    const updated = await runDb(async (db) => {
      const rows = await db
        .update(agentControlProfiles)
        .set({ status: "suspended", updatedBy: actor, updatedAt: new Date() })
        .where(
          sql`${agentControlProfiles.workspaceId} = ${workspaceId}
            AND ${agentControlProfiles.agentKey} = ${agentKey}
            AND ${agentControlProfiles.status} = 'active'`
        )
        .returning();
      if (!rows.length) return false;
      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "agent_control_profile_suspended",
        actor,
        payload: { agentKey, versions: rows.map((row) => row.version) }
      });
      return true;
    });
    if (updated === null) return Boolean(store.suspendAgentControlProfile(workspaceId, agentKey, actor));
    return updated;
  },

  async getConversation(workspaceId: string, userId: string, limit = 20): Promise<ConversationMessage[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(askConversationMessages)
        .where(sql`${askConversationMessages.workspaceId} = ${workspaceId} AND ${askConversationMessages.userId} = ${userId}`)
        .orderBy(desc(askConversationMessages.createdAt))
        .limit(limit)
    );
    if (!rows) return store.getConversation(workspaceId, userId, limit);
    return rows
      .reverse()
      .map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        userId: row.userId,
        role: row.role === "assistant" ? "assistant" : "user",
        text: row.text,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
      }));
  },

  async appendConversation(workspaceId: string, userId: string, role: "user" | "assistant", text: string): Promise<ConversationMessage> {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const wrote = await runDb(async (db) => {
      const [row] = await db
        .insert(askConversationMessages)
        .values({
          id,
          workspaceId,
          userId,
          role,
          text,
          createdAt: now
        })
        .returning();
      return row;
    });
    if (wrote) {
      return {
        id: wrote.id,
        workspaceId: wrote.workspaceId,
        userId: wrote.userId,
        role: wrote.role === "assistant" ? "assistant" : "user",
        text: wrote.text,
        createdAt: wrote.createdAt instanceof Date ? wrote.createdAt.toISOString() : String(wrote.createdAt)
      };
    }
    return store.appendConversation(workspaceId, userId, role, text);
  },

  async clearConversation(workspaceId: string, userId: string): Promise<void> {
    const cleared = await runDb(async (db) => {
      await db
        .delete(askConversationMessages)
        .where(sql`${askConversationMessages.workspaceId} = ${workspaceId} AND ${askConversationMessages.userId} = ${userId}`);
      return true;
    });
    if (!cleared) store.clearConversation(workspaceId, userId);
  },

  checkSlackSafety(text: string, refs: string[]) {
    return store.checkSlackSafety(text, refs);
  },

  // -------------------------------------------------------------------------
  // Decision & Action Twin (Phase 8A)
  // -------------------------------------------------------------------------

  async listDecisions(workspaceId: string, status?: DecisionStatus): Promise<Decision[]> {
    const rows = await runDb((db) =>
      db.select().from(decisions)
        .where(sql`${decisions.workspaceId} = ${workspaceId}
          ${status ? sql`AND ${decisions.status} = ${status}` : sql``}`)
        .orderBy(desc(decisions.createdAt))
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id:             r.id,
        workspaceId:    r.workspaceId,
        title:          r.title,
        owner:          r.owner,
        rationale:      r.rationale,
        status:         r.status as DecisionStatus,
        sourceOutputId: r.sourceOutputId ?? null,
        deadline:       r.deadline?.toISOString() ?? null,
        priority:       (r.priority ?? "medium") as Decision["priority"],
        evidenceRefs:   [],
        decidedAt:      r.decidedAt?.toISOString() ?? null,
        createdAt:      r.createdAt.toISOString(),
        updatedAt:      r.updatedAt.toISOString()
      }));
    }
    return store.getDecisions(workspaceId)
      .filter((d) => !status || d.status === status);
  },

  async createDecision(workspaceId: string, input: DecisionInput, actor: string): Promise<Decision> {
    const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const record = {
      id,
      workspaceId,
      title:          input.title,
      owner:          input.owner,
      rationale:      input.rationale,
      status:         (input.status ?? "open") as Decision["status"],
      sourceOutputId: input.sourceOutputId ?? null,
      deadline:       input.deadline ? new Date(input.deadline) : null,
      priority:       input.priority ?? "medium",
      decidedAt:      null,
      createdAt:      now,
      updatedAt:      now
    };
    await runDb((db) => db.transaction(async (tx) => {
      await tx.insert(decisions).values(record);
      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "decision_created",
        actor,
        payload: { decisionId: id, title: input.title, owner: input.owner, priority: input.priority ?? "medium" },
        createdAt: now
      });
    })).catch(() => null);
    const result: Decision = {
      id, workspaceId,
      title:          input.title,
      owner:          input.owner,
      rationale:      input.rationale,
      status:         (input.status ?? "open") as Decision["status"],
      sourceOutputId: input.sourceOutputId ?? null,
      deadline:       input.deadline ?? null,
      priority:       input.priority ?? "medium",
      evidenceRefs:   [],
      decidedAt:      null,
      createdAt:      now.toISOString(),
      updatedAt:      now.toISOString()
    };
    store.saveDecision(result);
    return result;
  },

  async updateDecision(id: string, workspaceId: string, patch: Partial<DecisionInput> & { status?: DecisionStatus }, actor: string): Promise<Decision | null> {
    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now };
    if (patch.title     !== undefined) set.title     = patch.title;
    if (patch.owner     !== undefined) set.owner     = patch.owner;
    if (patch.rationale !== undefined) set.rationale = patch.rationale;
    if (patch.priority  !== undefined) set.priority  = patch.priority;
    if (patch.deadline  !== undefined) set.deadline  = patch.deadline ? new Date(patch.deadline) : null;
    if (patch.status    !== undefined) {
      set.status = patch.status;
      if (patch.status === "decided") set.decidedAt = now;
    }
    await runDb((db) => db.transaction(async (tx) => {
      await tx.update(decisions).set(set)
        .where(sql`${decisions.id} = ${id} AND ${decisions.workspaceId} = ${workspaceId}`);
      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "decision_updated",
        actor,
        payload: { decisionId: id, patch },
        createdAt: now
      });
    })).catch(() => null);
    const updated = await repository.listDecisions(workspaceId);
    return updated.find((d) => d.id === id) ?? null;
  },

  async listActions(workspaceId: string, decisionId?: string, status?: ActionStatus): Promise<Action[]> {
    const rows = await runDb((db) =>
      db.select().from(actions)
        .where(sql`${actions.workspaceId} = ${workspaceId}
          ${decisionId ? sql`AND ${actions.decisionId} = ${decisionId}` : sql``}
          ${status ? sql`AND ${actions.status} = ${status}` : sql``}`)
        .orderBy(actions.isBlocker, actions.dueDate, desc(actions.createdAt))
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id:          r.id,
        workspaceId: r.workspaceId,
        decisionId:  r.decisionId,
        actionText:  r.actionText,
        owner:       r.owner,
        dueDate:     r.dueDate?.toISOString() ?? null,
        isBlocker:   r.isBlocker,
        status:      r.status as ActionStatus,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt:   r.createdAt.toISOString(),
        updatedAt:   r.updatedAt.toISOString()
      }));
    }
    return store.listActions(workspaceId, decisionId, status);
  },

  async createAction(workspaceId: string, input: ActionInput, actor: string): Promise<Action> {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const record = {
      id,
      workspaceId,
      decisionId:  input.decisionId,
      actionText:  input.actionText,
      owner:       input.owner,
      dueDate:     input.dueDate ? new Date(input.dueDate) : null,
      isBlocker:   input.isBlocker ?? false,
      status:      "open" as const,
      completedAt: null,
      createdAt:   now,
      updatedAt:   now
    };
    await runDb((db) => db.transaction(async (tx) => {
      await tx.insert(actions).values(record);
      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "action_created",
        actor,
        payload: { actionId: id, decisionId: input.decisionId, owner: input.owner, isBlocker: input.isBlocker ?? false },
        createdAt: now
      });
    })).catch(() => null);
    const result: Action = {
      id, workspaceId,
      decisionId:  input.decisionId,
      actionText:  input.actionText,
      owner:       input.owner,
      dueDate:     input.dueDate ?? null,
      isBlocker:   input.isBlocker ?? false,
      status:      "open",
      completedAt: null,
      createdAt:   now.toISOString(),
      updatedAt:   now.toISOString()
    };
    store.saveAction(result);
    return result;
  },

  async updateAction(id: string, workspaceId: string, patch: { status?: ActionStatus; owner?: string; dueDate?: string | null; isBlocker?: boolean }, actor: string): Promise<Action | null> {
    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now };
    if (patch.owner     !== undefined) set.owner     = patch.owner;
    if (patch.isBlocker !== undefined) set.isBlocker = patch.isBlocker;
    if (patch.dueDate   !== undefined) set.dueDate   = patch.dueDate ? new Date(patch.dueDate) : null;
    if (patch.status    !== undefined) {
      set.status = patch.status;
      if (patch.status === "done") set.completedAt = now;
    }
    await runDb((db) => db.transaction(async (tx) => {
      await tx.update(actions).set(set)
        .where(sql`${actions.id} = ${id} AND ${actions.workspaceId} = ${workspaceId}`);
      await tx.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "action_updated",
        actor,
        payload: { actionId: id, patch },
        createdAt: now
      });
    })).catch(() => null);
    const all = await repository.listActions(workspaceId);
    return all.find((a) => a.id === id) ?? null;
  },

  async listWorkflowTwins(workspaceId: string): Promise<WorkflowTwin[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(workflowTwins)
        .where(eq(workflowTwins.workspaceId, workspaceId))
        .orderBy(desc(workflowTwins.updatedAt))
    );
    if (rows) return rows.map(toWorkflowTwin);
    return store.listWorkflowTwins(workspaceId);
  },

  async getWorkflowTwin(workspaceId: string, id: string): Promise<WorkflowTwin | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(workflowTwins)
        .where(sql`${workflowTwins.workspaceId} = ${workspaceId} AND ${workflowTwins.id} = ${id}`)
        .limit(1)
    );
    if (rows) return rows[0] ? toWorkflowTwin(rows[0]) : null;
    return store.getWorkflowTwin(workspaceId, id);
  },

  async createWorkflowTwin(workspaceId: string, input: WorkflowTwinInput, actor: string): Promise<WorkflowTwin> {
    const id = `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const saved = await runDb(async (db) => {
      const [row] = await db
        .insert(workflowTwins)
        .values({
          id,
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
        })
        .returning();

      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "workflow_twin_created",
        actor,
        payload: { twinId: id, twinType: input.type, name: input.name, status: input.status ?? "draft" },
        createdAt: now
      });

      return toWorkflowTwin(row);
    });
    if (saved) return saved;
    return store.createWorkflowTwin(workspaceId, input, actor);
  },

  async updateWorkflowTwinConfig(
    workspaceId: string,
    id: string,
    config: Record<string, unknown>,
    actor: string
  ): Promise<WorkflowTwin | null> {
    const now = new Date();
    const saved = await runDb(async (db) => {
      const existing = await db
        .select()
        .from(workflowTwins)
        .where(sql`${workflowTwins.workspaceId} = ${workspaceId} AND ${workflowTwins.id} = ${id}`)
        .limit(1);
      if (!existing[0]) return null;

      const nextConfig = {
        ...(existing[0].config as Record<string, unknown> ?? {}),
        ...config,
        updatedAt: now.toISOString(),
        updatedBy: actor,
      };

      const [row] = await db
        .update(workflowTwins)
        .set({
          config: nextConfig,
          updatedBy: actor,
          updatedAt: now
        })
        .where(sql`${workflowTwins.workspaceId} = ${workspaceId} AND ${workflowTwins.id} = ${id}`)
        .returning();

      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "workflow_twin_config_updated",
        actor,
        payload: { twinId: id, config: nextConfig },
        createdAt: now
      });

      return row ? toWorkflowTwin(row) : null;
    });
    if (saved !== null) return saved;

    const current = store.getWorkflowTwin(workspaceId, id);
    if (!current) return null;
    const next: WorkflowTwin = {
      ...current,
      config: {
        ...current.config,
        ...config,
        updatedAt: now.toISOString(),
        updatedBy: actor,
      },
      updatedBy: actor,
      updatedAt: now.toISOString(),
    };
    store.upsertWorkflowTwin(next);
    store.pushAudit({
      workspaceId,
      type: "workflow_twin_config_updated",
      actor,
      payload: { twinId: id, config: next.config }
    });
    return next;
  },

  async listWorkflowTwinRuns(workspaceId: string, twinId?: string): Promise<WorkflowTwinRun[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(workflowTwinRuns)
        .where(sql`${workflowTwinRuns.workspaceId} = ${workspaceId}
          ${twinId ? sql`AND ${workflowTwinRuns.twinId} = ${twinId}` : sql``}`)
        .orderBy(desc(workflowTwinRuns.runAt))
    );
    if (rows) return rows.map(toWorkflowTwinRun);
    return store.listWorkflowTwinRuns(workspaceId, twinId);
  },

  async createWorkflowTwinRun(
    workspaceId: string,
    twin: WorkflowTwin,
    input: WorkflowTwinRunInput,
    actor: string
  ): Promise<WorkflowTwinRun> {
    const id = `wtr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const saved = await runDb(async (db) => {
      const [row] = await db
        .insert(workflowTwinRuns)
        .values({
          id,
          workspaceId,
          twinId: twin.id,
          twinType: twin.type,
          evidenceRefs: input.evidenceRefs ?? [],
          generatedOutputRefs: input.generatedOutputRefs ?? [],
          confidence: encodeStoredPercent(input.confidence ?? 0.7),
          status: input.status ?? "generated",
          summary: input.summary,
          payload: input.payload ?? {},
          runAt: now
        })
        .returning();

      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "workflow_twin_run_created",
        actor,
        payload: {
          twinId: twin.id,
          runId: id,
          twinType: twin.type,
          status: input.status ?? "generated",
          evidenceRefs: input.evidenceRefs ?? [],
          generatedOutputRefs: input.generatedOutputRefs ?? [],
          confidence: input.confidence ?? 0.7
        },
        createdAt: now
      });

      return toWorkflowTwinRun(row);
    });
    if (saved) return saved;
    return store.createWorkflowTwinRun(workspaceId, twin, input, actor);
  },

  // keep legacy read-only accessor for backward compat
  getDecisions(workspaceId: string) {
    return store.getDecisions(workspaceId);
  },

  // -------------------------------------------------------------------------
  // Agent key management
  // -------------------------------------------------------------------------

  async createAgentKey(input: {
    workspaceId: string;
    name: string;
    scopes: AgentScope[];
    expiresAt?: string;
  }): Promise<AgentKeyCreated> {
    const { createHmac, randomBytes } = await import("crypto");
    const rawSecret = randomBytes(32).toString("hex");
    const prefix = rawSecret.slice(0, 8);
    const keyHash = createHmac("sha256", process.env.AUTH_SECRET ?? "nexus-dev-secret")
      .update(rawSecret)
      .digest("hex");
    const id = `ak-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const record: AgentKey = {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      prefix,
      scopes: input.scopes,
      active: true,
      createdAt: now,
      expiresAt: input.expiresAt
    };

    await runDb(async (db) => {
      await db.insert(agentKeys).values({
        id: record.id,
        workspaceId: record.workspaceId,
        name: record.name,
        prefix: record.prefix,
        keyHash,
        scopes: record.scopes,
        active: true,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      });
    });

    store.addAgentKey({ ...record, keyHash });

    return { ...record, secret: rawSecret };
  },

  async listAgentKeys(workspaceId: string): Promise<AgentKey[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(agentKeys)
        .where(eq(agentKeys.workspaceId, workspaceId))
        .orderBy(desc(agentKeys.createdAt))
    );
    if (!rows) return store.listAgentKeys(workspaceId);
    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      prefix: r.prefix,
      scopes: (r.scopes as AgentScope[]) ?? [],
      active: r.active,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString()
    }));
  },

  async revokeAgentKey(id: string): Promise<boolean> {
    const updated = await runDb(async (db) => {
      const rows = await db
        .update(agentKeys)
        .set({ active: false })
        .where(eq(agentKeys.id, id))
        .returning();
      return rows.length > 0;
    });
    if (updated === null) return store.revokeAgentKey(id);
    return updated;
  },

  async verifyAgentKey(rawSecret: string, workspaceId: string): Promise<AgentKey | null> {
    const { createHmac } = await import("crypto");
    const keyHash = createHmac("sha256", process.env.AUTH_SECRET ?? "nexus-dev-secret")
      .update(rawSecret)
      .digest("hex");

    const rows = await runDb((db) =>
      db
        .select()
        .from(agentKeys)
        .where(
          sql`${agentKeys.keyHash} = ${keyHash}
            AND ${agentKeys.workspaceId} = ${workspaceId}
            AND ${agentKeys.active} = true`
        )
        .limit(1)
    );

    if (!rows || !rows.length) {
      // Fallback to in-memory store
      return store.verifyAgentKey(rawSecret, workspaceId);
    }

    const r = rows[0];
    if (r.expiresAt && r.expiresAt < new Date()) return null;

    // Fire-and-forget: update last_used_at
    runDb((db) =>
      db
        .update(agentKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(agentKeys.id, r.id))
    ).catch(() => {});

    return {
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      prefix: r.prefix,
      scopes: (r.scopes as AgentScope[]) ?? [],
      active: r.active,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString()
    };
  },

  // -------------------------------------------------------------------------
  // Workspace settings
  // -------------------------------------------------------------------------

  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    const rows = await runDb((db) =>
      db.select().from(workspaceSettings).where(eq(workspaceSettings.workspaceId, workspaceId)).limit(1)
    );
    if (rows && rows.length) {
      const r = rows[0];
      return {
        workspaceId: r.workspaceId,
        name: r.name,
        timezone: r.timezone,
        llmProvider: r.llmProvider as WorkspaceSettings["llmProvider"],
        llmModel: r.llmModel,
        quarantineThreshold: r.quarantineThreshold / 100,
        defaultSensitivity: r.defaultSensitivity,
        slackEnabled: r.slackEnabled,
        teamsEnabled: r.teamsEnabled,
        allowedProviders: Array.isArray(r.allowedProviders) ? r.allowedProviders as WorkspaceSettings["allowedProviders"] : ["anthropic", "deepseek", "openai_compatible"],
        localOnlyMode: r.localOnlyMode ?? false,
        sensitivityCeiling: r.sensitivityCeiling ?? "confidential",
        approvalRequiredThreshold: decodeStoredPercent(r.approvalRequiredThreshold ?? 70),
        demoMode: r.demoMode ?? false,
        whiteLabelBrand: r.whiteLabelBrand ?? null,
        updatedAt: r.updatedAt.toISOString()
      };
    }
    return store.getWorkspaceSettings(workspaceId);
  },

  async updateWorkspaceSettings(
    workspaceId: string,
    patch: Partial<Omit<WorkspaceSettings, "workspaceId" | "updatedAt">>
  ): Promise<WorkspaceSettings> {
    const current = await repository.getWorkspaceSettings(workspaceId);
    const next: WorkspaceSettings = { ...current, ...patch, workspaceId, updatedAt: new Date().toISOString() };

    await runDb(async (db) => {
      await db
        .insert(workspaceSettings)
        .values({
          workspaceId,
          name: next.name,
          timezone: next.timezone,
          llmProvider: next.llmProvider,
          llmModel: next.llmModel,
          quarantineThreshold: Math.round(next.quarantineThreshold * 100),
          defaultSensitivity: next.defaultSensitivity,
          slackEnabled: next.slackEnabled,
          teamsEnabled: next.teamsEnabled,
          allowedProviders: next.allowedProviders,
          localOnlyMode: next.localOnlyMode,
          sensitivityCeiling: next.sensitivityCeiling,
          approvalRequiredThreshold: Math.round(next.approvalRequiredThreshold * 100),
          demoMode: next.demoMode ?? false,
          whiteLabelBrand: next.whiteLabelBrand ?? null,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: workspaceSettings.workspaceId,
          set: {
            name: next.name,
            timezone: next.timezone,
            llmProvider: next.llmProvider,
            llmModel: next.llmModel,
            quarantineThreshold: Math.round(next.quarantineThreshold * 100),
            defaultSensitivity: next.defaultSensitivity,
            slackEnabled: next.slackEnabled,
            teamsEnabled: next.teamsEnabled,
            allowedProviders: next.allowedProviders,
            localOnlyMode: next.localOnlyMode,
            sensitivityCeiling: next.sensitivityCeiling,
            approvalRequiredThreshold: Math.round(next.approvalRequiredThreshold * 100),
            demoMode: next.demoMode ?? false,
            whiteLabelBrand: next.whiteLabelBrand ?? null,
            updatedAt: new Date()
          }
        });
    });

    store.updateWorkspaceSettings(workspaceId, next);
    return next;
  },

  async upsertPromptRegistry(entries: PromptRegistryEntry[]): Promise<void> {
    const wrote = await runDb(async (db) => {
      for (const entry of entries) {
        await db
          .insert(promptRegistry)
          .values({
            key: entry.key,
            version: entry.version,
            owner: entry.owner,
            description: entry.description,
            template: entry.template,
            changelog: entry.changelog,
            lastUpdated: new Date(entry.lastUpdated)
          })
          .onConflictDoUpdate({
            target: promptRegistry.key,
            set: {
              version: entry.version,
              owner: entry.owner,
              description: entry.description,
              template: entry.template,
              changelog: entry.changelog,
              lastUpdated: new Date(entry.lastUpdated)
            }
          });
      }
      return true;
    });
    if (!wrote) return;
  },

  async listPromptRegistry(): Promise<PromptRegistryEntry[]> {
    const rows = await runDb((db) =>
      db.select().from(promptRegistry).orderBy(promptRegistry.key)
    );
    if (!rows) return [];
    return rows.map((row) => ({
      key: row.key,
      version: row.version,
      owner: row.owner,
      description: row.description,
      template: row.template,
      changelog: Array.isArray(row.changelog) ? row.changelog : [],
      lastUpdated: row.lastUpdated instanceof Date ? row.lastUpdated.toISOString() : String(row.lastUpdated)
    }));
  },

  async saveEvalRun(run: EvalRunSummary): Promise<void> {
    const wrote = await runDb(async (db) => {
      await db.insert(evalRuns).values({
        id: run.id,
        workspaceId: run.workspaceId,
        total: run.total,
        passed: run.passed,
        failed: run.failed,
        passRate: Math.round(run.passRate * 100),
        avgConfidence: Math.round(run.avgConfidence * 100),
        avgLatencyMs: run.avgLatencyMs,
        results: run.results,
        createdAt: new Date(run.createdAt)
      });
      return true;
    });
    if (!wrote) {
      await repository.pushAudit({
        workspaceId: run.workspaceId,
        type: "eval_run_complete",
        actor: "eval_harness",
        payload: run as unknown as Record<string, unknown>
      });
    }
  },

  async listEvalRuns(workspaceId: string, limit = 10): Promise<EvalRunSummary[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(evalRuns)
        .where(eq(evalRuns.workspaceId, workspaceId))
        .orderBy(desc(evalRuns.createdAt))
        .limit(limit)
    );
    if (rows) {
      return rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        total: row.total,
        passed: row.passed,
        failed: row.failed,
        passRate: decodeStoredPercent(row.passRate),
        avgConfidence: decodeStoredPercent(row.avgConfidence),
        avgLatencyMs: row.avgLatencyMs,
        results: Array.isArray(row.results) ? row.results as EvalRunSummary["results"] : [],
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
      }));
    }
    const audits = await repository.getAuditEvents(workspaceId, limit * 3);
    return audits
      .filter((event) => event.type === "eval_run_complete")
      .slice(0, limit)
      .map((event) => event.payload as unknown as EvalRunSummary);
  },

  // -------------------------------------------------------------------------
  // Workspace provisioning (Clerk org → NexusAI tenant + workspace)
  // -------------------------------------------------------------------------

  /**
   * Idempotently provision a tenant, workspace, and default settings for a
   * Clerk org. Called on first sign-in or from the Clerk org.created webhook.
   * Safe to call multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
   */
  async provisionWorkspace(input: {
    clerkOrgId: string;
    orgName: string;
    ownerClerkUserId: string;
  }): Promise<{ workspaceId: string; provisioned: boolean }> {
    const { clerkOrgId, orgName, ownerClerkUserId } = input;
    // Clerk orgId IS the workspaceId — keeps the mapping trivial
    const workspaceId = clerkOrgId;
    const tenantId = clerkOrgId;
    const now = new Date();

    const wrote = await runDb(async (db) => {
      // tenant row (idempotent)
      await db
        .insert(tenants)
        .values({ id: tenantId, name: orgName, createdAt: now })
        .onConflictDoNothing();

      // workspace row (idempotent)
      await db
        .insert(workspaces)
        .values({ id: workspaceId, tenantId, name: orgName, createdAt: now })
        .onConflictDoNothing();

      // default workspace settings (idempotent)
      await db
        .insert(workspaceSettings)
        .values({
          workspaceId,
          name: orgName,
          timezone: "UTC",
          llmProvider: "anthropic",
          llmModel: process.env.NEXUS_LLM_MODEL ?? "claude-opus-4-6",
          quarantineThreshold: 55,
          defaultSensitivity: "internal",
          slackEnabled: false,
          teamsEnabled: false,
          allowedProviders: ["anthropic", "deepseek", "openai_compatible"],
          localOnlyMode: false,
          sensitivityCeiling: "confidential",
          approvalRequiredThreshold: 70,
          demoMode: false,
          updatedAt: now
        })
        .onConflictDoNothing();

      return true;
    });

    // In-memory store fallback for dev (no DB)
    if (!wrote) {
      store.updateWorkspaceSettings(workspaceId, {
        workspaceId,
        name: orgName,
        timezone: "UTC",
        llmProvider: "anthropic",
        llmModel: process.env.NEXUS_LLM_MODEL ?? "claude-opus-4-6",
        quarantineThreshold: 0.55,
        defaultSensitivity: "internal",
        slackEnabled: false,
        teamsEnabled: false,
        allowedProviders: ["anthropic", "deepseek", "openai_compatible"],
        localOnlyMode: false,
        sensitivityCeiling: "confidential",
        approvalRequiredThreshold: 0.7,
        demoMode: false,
        updatedAt: now.toISOString()
      });
    }

    void ownerClerkUserId; // future: seed user row in DB roles table

    return { workspaceId, provisioned: true };
  },

  /**
   * Returns true if this workspace has been provisioned (settings row exists).
   * Used by layout and onboarding to detect first-time org sign-in.
   */
  async isWorkspaceProvisioned(workspaceId: string): Promise<boolean> {
    const rows = await runDb((db) =>
      db
        .select({ workspaceId: workspaceSettings.workspaceId })
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspaceId))
        .limit(1)
    );
    if (rows && rows.length > 0) return true;
    // In-memory fallback: consider the demo workspace always provisioned so dev
    // mode doesn't redirect everyone to onboarding on every page load.
    return workspaceId === (process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo");
  },

  /**
   * Returns the subscription status for a workspace.
   * Falls back to "active" when DB is unavailable so the UI never incorrectly
   * blocks access in dev/offline mode.
   */
  async getWorkspaceStatus(workspaceId: string): Promise<WorkspaceStatusRecord> {
    const rows = await runDb((db) =>
      db
        .select({
          status: workspaces.status,
          trialEndsAt: workspaces.trialEndsAt,
          suspendedAt: workspaces.suspendedAt,
          expiresAt: workspaces.expiresAt,
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1)
    );
    if (!rows || rows.length === 0) {
      return { status: "active", trialEndsAt: null, suspendedAt: null, expiresAt: null };
    }
    const row = rows[0];
    return {
      status: (row.status ?? "active") as WorkspaceStatus,
      trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
      suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    };
  },

  /**
   * Sets or clears a time-boxed expiry deadline on a workspace (Vantage
   * per-deal, Meridian per-submission workspaces). Does not itself block
   * access — convertExpiredWorkspaces() (cron) applies the block once the
   * deadline passes, same mechanism as suspendWorkspace().
   */
  async setWorkspaceExpiry(workspaceId: string, expiresAt: string | null): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({ expiresAt: expiresAt ? new Date(expiresAt) : null })
        .where(eq(workspaces.id, workspaceId))
    );
    void this.pushAudit({
      workspaceId,
      type: "workspace_expiry_set",
      actor: "system",
      payload: { expiresAt },
    }).catch(() => {});
  },

  /**
   * Suspends workspaces whose expiry deadline has passed. Reuses the same
   * suspendedAt mechanism as payment-failure suspension — deliberately does
   * NOT delete any data. Call purgeWorkspaceData separately and explicitly
   * if data deletion is actually wanted.
   */
  async convertExpiredWorkspaces(): Promise<number> {
    const result = await runDb((db) =>
      db.execute(
        sql`UPDATE workspaces
            SET suspended_at = NOW()
            WHERE expires_at IS NOT NULL
              AND expires_at < NOW()
              AND suspended_at IS NULL
              AND status NOT IN ('cancelled')`
      )
    );
    const count = (result as { rowCount?: number })?.rowCount ?? 0;
    if (count > 0) {
      void this.pushAudit({
        workspaceId: "_system_",
        type: "workspaces_expired",
        actor: "cron",
        payload: { convertedCount: count, ranAt: new Date().toISOString() },
      }).catch(() => {});
    }
    return count;
  },

  /**
   * Deliberate, explicit data deletion for one workspace — evidence,
   * entities, and agent outputs. NEVER called automatically by a cron; this
   * is only for an explicit admin action (e.g. "delete this expired deal
   * workspace now"). The workspace row itself and its audit trail are kept.
   */
  async purgeWorkspaceData(workspaceId: string): Promise<{ evidenceDeleted: number; entitiesDeleted: number; agentOutputsDeleted: number }> {
    const result = await runDb((db) => db.transaction(async (tx) => {
      const evidenceResult = await tx.delete(evidenceRecords).where(eq(evidenceRecords.workspaceId, workspaceId));
      const entitiesResult = await tx.delete(entities).where(eq(entities.workspaceId, workspaceId));
      const outputsResult = await tx.delete(agentOutputs).where(eq(agentOutputs.workspaceId, workspaceId));
      return {
        evidenceDeleted: (evidenceResult as { rowCount?: number })?.rowCount ?? 0,
        entitiesDeleted: (entitiesResult as { rowCount?: number })?.rowCount ?? 0,
        agentOutputsDeleted: (outputsResult as { rowCount?: number })?.rowCount ?? 0,
      };
    }));
    const counts = result ?? { evidenceDeleted: 0, entitiesDeleted: 0, agentOutputsDeleted: 0 };
    void this.pushAudit({
      workspaceId: "_system_",
      type: "workspace_data_purged",
      actor: "admin",
      payload: { purgedWorkspaceId: workspaceId, ...counts, purgedAt: new Date().toISOString() },
    }).catch(() => {});
    return counts;
  },

  /**
   * Writes a single LLM call record to llm_usage for cost monitoring.
   * Fire-and-forget — callers should not await this or let it block the LLM response.
   */
  async recordLLMUsage(input: LLMUsageInput): Promise<void> {
    const { workspaceId, model, route, inputTokens, outputTokens, costUsdMicro = 0 } = input;
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const id = `llm_${workspaceId}_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`;

    await runDb((db) =>
      db.insert(llmUsage).values({
        id,
        workspaceId,
        recordedAt: now,
        day,
        model,
        route,
        inputTokens,
        outputTokens,
        costUsdMicro,
      })
    ).catch(() => {
      // Non-fatal — cost tracking should never break the product
    });

    // Also atomically increment monthly_token_used on the workspace
    const totalTokens = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
    if (totalTokens > 0) {
      void runDb((db) =>
        db.execute(
          sql`UPDATE workspaces SET monthly_token_used = monthly_token_used + ${totalTokens} WHERE id = ${input.workspaceId}`
        )
      ).catch(() => {
        // Non-fatal
      });
    }
  },

  // -------------------------------------------------------------------------
  // Billing: workspace billing state and plan definitions
  // -------------------------------------------------------------------------

  async getWorkspaceBillingState(workspaceId: string): Promise<{
    plan: string;
    monthlyTokenLimit: number;
    monthlyTokenUsed: number;
    tokenResetAt: string;
    planChangedAt: string | null;
  } | null> {
    const rows = await runDb((db) =>
      db
        .select({
          plan: workspaces.plan,
          monthlyTokenLimit: workspaces.monthlyTokenLimit,
          monthlyTokenUsed: workspaces.monthlyTokenUsed,
          tokenResetAt: workspaces.tokenResetAt,
          planChangedAt: workspaces.planChangedAt,
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1)
    );
    if (!rows || !rows.length) return null;
    const r = rows[0];
    return {
      plan: r.plan,
      monthlyTokenLimit: r.monthlyTokenLimit,
      monthlyTokenUsed: r.monthlyTokenUsed,
      tokenResetAt: r.tokenResetAt?.toISOString() ?? new Date().toISOString(),
      planChangedAt: r.planChangedAt?.toISOString() ?? null,
    };
  },

  async getPlanDefinition(planKey: string): Promise<import("@/lib/contracts").PlanDefinition | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(planDefinitions)
        .where(eq(planDefinitions.planKey, planKey))
        .limit(1)
    );
    if (!rows || !rows.length) return null;
    const r = rows[0];
    return {
      planKey: r.planKey,
      label: r.label,
      priceCents: r.priceCents,
      monthlyTokens: r.monthlyTokens,
      maxRoles: r.maxRoles,
      maxEvidence: r.maxEvidence,
      maxTeam: r.maxTeam,
      maxConnectors: r.maxConnectors,
      maxApiKeys: r.maxApiKeys,
      askDailyLimit: r.askDailyLimit,
      scheduledSynthesis: r.scheduledSynthesis,
      synthesisMaxCadence: r.synthesisMaxCadence,
      emailDelivery: r.emailDelivery,
      slackDelivery: r.slackDelivery,
      exportsEnabled: r.exportsEnabled,
      decisionExtraction: r.decisionExtraction,
      customPassports: r.customPassports,
      dataResidency: r.dataResidency,
      apiAccess: r.apiAccess,
      watermark: r.watermark,
      stripePriceId: r.stripePriceId,
    };
  },

  /** Reverse lookup: which plan does this Stripe price ID belong to? */
  async getPlanDefinitionByStripePriceId(stripePriceId: string): Promise<import("@/lib/contracts").PlanDefinition | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(planDefinitions)
        .where(eq(planDefinitions.stripePriceId, stripePriceId))
        .limit(1)
    );
    if (!rows || !rows.length) return null;
    const r = rows[0];
    return {
      planKey: r.planKey,
      label: r.label,
      priceCents: r.priceCents,
      monthlyTokens: r.monthlyTokens,
      maxRoles: r.maxRoles,
      maxEvidence: r.maxEvidence,
      maxTeam: r.maxTeam,
      maxConnectors: r.maxConnectors,
      maxApiKeys: r.maxApiKeys,
      askDailyLimit: r.askDailyLimit,
      scheduledSynthesis: r.scheduledSynthesis,
      synthesisMaxCadence: r.synthesisMaxCadence,
      emailDelivery: r.emailDelivery,
      slackDelivery: r.slackDelivery,
      exportsEnabled: r.exportsEnabled,
      decisionExtraction: r.decisionExtraction,
      customPassports: r.customPassports,
      dataResidency: r.dataResidency,
      apiAccess: r.apiAccess,
      watermark: r.watermark,
      stripePriceId: r.stripePriceId,
    };
  },

  async updateWorkspacePlan(workspaceId: string, plan: string, monthlyTokenLimit: number): Promise<void> {
    await runDb((db) =>
      db
        .update(workspaces)
        .set({
          plan,
          monthlyTokenLimit,
          monthlyTokenUsed: 0,
          planChangedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId))
    );
    // Audit event
    void this.pushAudit({
      workspaceId,
      type: "plan_upgraded",
      actor: "system",
      payload: { plan, monthlyTokenLimit },
    }).catch(() => {});
  },

  async resetMonthlyTokens(workspaceId: string): Promise<void> {
    await runDb((db) =>
      db.execute(
        sql`UPDATE workspaces
            SET monthly_token_used = 0,
                token_reset_at = token_reset_at + interval '1 month'
            WHERE id = ${workspaceId}
              AND token_reset_at <= NOW()`
      )
    );
  },

  async resetAllDueMonthlyTokens(): Promise<number> {
    const result = await runDb((db) =>
      db.execute(
        sql`UPDATE workspaces
            SET monthly_token_used = 0,
                token_reset_at = token_reset_at + interval '1 month'
            WHERE token_reset_at <= NOW()`
      )
    );
    return (result as { rowCount?: number })?.rowCount ?? 0;
  },

  // -------------------------------------------------------------------------
  // Stripe / plan lifecycle
  // -------------------------------------------------------------------------

  /** Returns the workspace's Stripe customer ID, or null if not yet set. */
  async getStripeCustomerId(workspaceId: string): Promise<string | null> {
    try {
      const rows = await runDb((db) =>
        db.select({ stripeCustomerId: workspaces.stripeCustomerId })
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)
      );
      return rows?.[0]?.stripeCustomerId ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Saves the Stripe customer and subscription IDs on the workspace.
   * Called from the webhook after checkout.session.completed.
   */
  async setStripeIds(
    workspaceId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({ stripeCustomerId, stripeSubscriptionId })
        .where(eq(workspaces.id, workspaceId))
    );
  },

  /**
   * Activates a plan after a successful Stripe payment.
   * Sets plan, token limit, clears token usage, saves Stripe IDs, writes audit event.
   */
  async activatePlan(
    workspaceId: string,
    plan: string,
    monthlyTokenLimit: number,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({
          plan,
          monthlyTokenLimit,
          monthlyTokenUsed: 0,
          stripeCustomerId,
          stripeSubscriptionId,
          status: "active",
          planChangedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId))
    );
    void this.pushAudit({
      workspaceId,
      type: "plan_activated",
      actor: "stripe",
      payload: { plan, monthlyTokenLimit, stripeCustomerId, stripeSubscriptionId },
    }).catch(() => {});
  },

  /**
   * Handles plan downgrade or cancellation from Stripe webhook.
   * If plan is null/free, reverts to free with default limits.
   */
  async handleSubscriptionChange(
    workspaceId: string,
    plan: string,
    monthlyTokenLimit: number,
    stripeSubscriptionId: string,
    reason: "updated" | "cancelled"
  ): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({
          plan,
          monthlyTokenLimit,
          stripeSubscriptionId: reason === "cancelled" ? null : stripeSubscriptionId,
          planChangedAt: new Date(),
          // Don't reset monthlyTokenUsed on downgrade — preserve usage history
        })
        .where(eq(workspaces.id, workspaceId))
    );
    void this.pushAudit({
      workspaceId,
      type: reason === "cancelled" ? "plan_cancelled" : "plan_changed",
      actor: "stripe",
      payload: { plan, monthlyTokenLimit, stripeSubscriptionId, reason },
    }).catch(() => {});
  },

  /**
   * Suspends a workspace on payment failure.
   * Sets suspendedAt timestamp; existing data is preserved.
   */
  async suspendWorkspace(workspaceId: string, reason: string): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({ suspendedAt: new Date() })
        .where(eq(workspaces.id, workspaceId))
    );
    void this.pushAudit({
      workspaceId,
      type: "workspace_suspended",
      actor: "stripe",
      payload: { reason },
    }).catch(() => {});
  },

  /**
   * Clears suspension on successful payment.
   */
  async unsuspendWorkspace(workspaceId: string): Promise<void> {
    await runDb((db) =>
      db.update(workspaces)
        .set({ suspendedAt: null })
        .where(eq(workspaces.id, workspaceId))
    );
    void this.pushAudit({
      workspaceId,
      type: "workspace_unsuspended",
      actor: "stripe",
      payload: {},
    }).catch(() => {});
  },

  /**
   * Converts expired trial workspaces to the free plan.
   * Returns count of workspaces converted.
   * Called from billing cron alongside monthly token reset.
   */
  async convertExpiredTrials(): Promise<number> {
    const result = await runDb((db) =>
      db.execute(
        sql`UPDATE workspaces
            SET plan = 'free',
                status = 'active',
                monthly_token_limit = 500000
            WHERE status = 'trial'
              AND trial_ends_at IS NOT NULL
              AND trial_ends_at < NOW()`
      )
    );
    const count = (result as { rowCount?: number })?.rowCount ?? 0;
    if (count > 0) {
      void this.pushAudit({
        workspaceId: "_system_",
        type: "trials_converted",
        actor: "cron",
        payload: { convertedCount: count, ranAt: new Date().toISOString() },
      }).catch(() => {});
    }
    return count;
  },

  /**
   * Finds a workspace by Stripe customer ID.
   * Used in webhook processing to map Stripe events back to NexusAI workspaces.
   */
  async getWorkspaceByStripeCustomer(stripeCustomerId: string): Promise<{ id: string; plan: string } | null> {
    try {
      const rows = await runDb((db) =>
        db.select({ id: workspaces.id, plan: workspaces.plan })
          .from(workspaces)
          .where(eq(workspaces.stripeCustomerId, stripeCustomerId))
          .limit(1)
      );
      return rows?.[0] ?? null;
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------------------
  // Connector management
  // -------------------------------------------------------------------------

  async listConnectors(workspaceId: string): Promise<ConnectorRecord[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(connectors)
        .where(eq(connectors.workspaceId, workspaceId))
        .orderBy(desc(connectors.installedAt))
    );
    if (!rows) return store.listConnectors(workspaceId);
    return rows.map(toConnector);
  },

  async upsertConnector(input: {
    workspaceId: string;
    type: string;
    installedBy: string;
    credentials?: Record<string, unknown>;
    config?: Record<string, unknown>;
  }): Promise<ConnectorRecord> {
    const id = `conn-${input.workspaceId}-${input.type}`;
    const encCreds = input.credentials
      ? encryptCredentials(JSON.stringify(input.credentials))
      : null;

    const wrote = await runDb(async (db) => {
      await db
        .insert(connectors)
        .values({
          id,
          workspaceId: input.workspaceId,
          type: input.type,
          status: "active",
          installedBy: input.installedBy,
          encryptedCredentials: encCreds,
          config: input.config ?? {}
        })
        .onConflictDoUpdate({
          target: connectors.id,
          set: {
            status: "active",
            encryptedCredentials: encCreds ?? undefined,
            config: input.config ?? {},
            lastSyncAt: new Date()
          }
        });
      return true;
    });

    const record: ConnectorRecord = {
      id,
      workspaceId: input.workspaceId,
      type: input.type,
      status: "active",
      installedBy: input.installedBy,
      installedAt: new Date().toISOString(),
      config: input.config ?? {}
    };

    if (!wrote) store.upsertConnector(record);
    return record;
  },

  async getConnectorCredentials(
    workspaceId: string,
    type: string
  ): Promise<Record<string, unknown> | null> {
    const id = `conn-${workspaceId}-${type}`;
    const rows = await runDb((db) =>
      db
        .select({ enc: connectors.encryptedCredentials })
        .from(connectors)
        .where(eq(connectors.id, id))
        .limit(1)
    );
    if (!rows || !rows[0]?.enc) return null;
    const plain = decryptCredentials(rows[0].enc);
    if (!plain) return null;
    try { return JSON.parse(plain) as Record<string, unknown>; }
    catch { return null; }
  },

  async revokeConnector(workspaceId: string, type: string): Promise<void> {
    const id = `conn-${workspaceId}-${type}`;
    await runDb((db) =>
      db
        .update(connectors)
        .set({ status: "revoked", encryptedCredentials: null })
        .where(eq(connectors.id, id))
    );
    store.revokeConnector(workspaceId, type);
  },

  async updateConnectorConfig(
    workspaceId: string,
    type: string,
    config: Record<string, unknown>,
    actor = "operator"
  ): Promise<ConnectorRecord | null> {
    const id = `conn-${workspaceId}-${type}`;
    const now = new Date();
    const saved = await runDb(async (db) => {
      const existing = await db
        .select()
        .from(connectors)
        .where(eq(connectors.id, id))
        .limit(1);
      if (!existing[0]) return null;

      const nextConfig = {
        ...(existing[0].config as Record<string, unknown> ?? {}),
        ...config,
        updatedAt: now.toISOString(),
        updatedBy: actor,
      };

      const [row] = await db
        .update(connectors)
        .set({ config: nextConfig })
        .where(eq(connectors.id, id))
        .returning();

      await db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "connector_policy_updated",
        actor,
        payload: { connectorType: type, config: nextConfig },
        createdAt: now
      });

      return row ? toConnector(row) : null;
    });

    if (saved !== null) return saved;
    const current = store.listConnectors(workspaceId).find((c) => c.type === type);
    if (!current) return null;
    const next = {
      ...current,
      config: {
        ...current.config,
        ...config,
        updatedAt: now.toISOString(),
        updatedBy: actor,
      }
    };
    store.upsertConnector(next);
    store.pushAudit({
      workspaceId,
      type: "connector_policy_updated",
      actor,
      payload: { connectorType: type, config: next.config }
    });
    return next;
  },

  // -------------------------------------------------------------------------
  // Vector embedding storage + retrieval
  // -------------------------------------------------------------------------

  /**
   * Persist a pre-computed embedding vector against an existing evidence record.
   * Called fire-and-forget from ingestEvidence after the record is committed.
   * Safe to call multiple times — overwrites the previous value if present.
   *
   * No-op when the DB is unavailable (in-memory mode doesn't store embeddings).
   * The column only exists after migration 0007 has been applied.
   */
  async storeEmbedding(evidenceId: string, embedding: number[]): Promise<void> {
    await runDb((db) =>
      db
        .update(evidenceRecords)
        // Pass the vector as a raw SQL literal so the pg driver sends the
        // correct pgvector wire format rather than a quoted JSON array.
        .set({ embedding: sql`${JSON.stringify(embedding)}::vector` as unknown as number[] })
        .where(eq(evidenceRecords.id, evidenceId))
    );
    // No in-memory fallback — store.ts holds EvidenceRecord objects which
    // don't carry embeddings. Vector search falls back to keyword in dev.
  },

  /**
   * Approximate nearest-neighbour search using HNSW cosine similarity.
   * Returns up to `limit` processed, non-restricted records ordered by
   * decreasing similarity to the query vector.
   *
   * Falls back to an empty array (triggering keyword fallback in retrieval)
   * when the DB is unavailable or the vector column doesn't exist yet.
   *
   * The <=> operator is pgvector cosine distance (lower = more similar),
   * so we ORDER BY ASC to get the closest matches first.
   */
  async searchEvidenceByVector(
    workspaceId: string,
    queryVector: number[],
    limit = 6,
    candidateIds?: string[]
  ): Promise<EvidenceRecord[]> {
    if (candidateIds && candidateIds.length === 0) return [];
    const candidateFilter = candidateIds
      ? sql`AND ${evidenceRecords.id} IN (${sql.join(candidateIds.map((id) => sql`${id}`), sql`, `)})`
      : sql``;
    const rows = await runDb((db) =>
      db
        .select()
        .from(evidenceRecords)
        .where(
          sql`${evidenceRecords.workspaceId} = ${workspaceId}
            AND ${evidenceRecords.ingestionStatus} = 'processed'
            AND ${evidenceRecords.sensitivity} <> 'restricted'
            AND ${evidenceRecords.embedding} IS NOT NULL
            ${candidateFilter}`
        )
        .orderBy(
          sql`${evidenceRecords.embedding} <=> ${JSON.stringify(queryVector)}::vector`
        )
        .limit(limit)
    );
    if (!rows) return [];
    return rows.map(toEvidenceRecord);
  },

  // ---------------------------------------------------------------------------
  // Workspace profile
  // ---------------------------------------------------------------------------

  async getWorkspaceProfile(workspaceId: string): Promise<WorkspaceProfile | null> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(workspaceProfiles)
        .where(eq(workspaceProfiles.workspaceId, workspaceId))
        .limit(1)
    );
    if (!rows || rows.length === 0) return store.getWorkspaceProfile(workspaceId);
    return toWorkspaceProfile(rows[0]);
  },

  async saveWorkspaceProfile(profile: WorkspaceProfile): Promise<WorkspaceProfile> {
    const saved = await runDb((db) =>
      db
        .insert(workspaceProfiles)
        .values({
          workspaceId: profile.workspaceId,
          companyName: profile.companyName ?? null,
          sector: profile.sector ?? null,
          subsector: profile.subsector ?? null,
          businessModel: profile.businessModel ?? null,
          companyStage: profile.companyStage ?? null,
          employeeBand: profile.employeeBand ?? null,
          region: profile.region ?? null,
          primaryGoals: profile.primaryGoals ?? [],
          riskProfile: profile.riskProfile ?? null,
          priorityRoles: profile.priorityRoles ?? [],
          companyArchetype: profile.companyArchetype ?? null,
          archetypeVersion: profile.archetypeVersion ?? null,
          briefLanguageMode: profile.briefLanguageMode ?? "formal",
          locationCount: profile.locationCount ?? 1,
          roleStates: profile.roleStates ?? {},
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: workspaceProfiles.workspaceId,
          set: {
            companyName: profile.companyName ?? null,
            sector: profile.sector ?? null,
            subsector: profile.subsector ?? null,
            businessModel: profile.businessModel ?? null,
            companyStage: profile.companyStage ?? null,
            employeeBand: profile.employeeBand ?? null,
            region: profile.region ?? null,
            primaryGoals: profile.primaryGoals ?? [],
            riskProfile: profile.riskProfile ?? null,
            priorityRoles: profile.priorityRoles ?? [],
            companyArchetype: profile.companyArchetype ?? null,
            archetypeVersion: profile.archetypeVersion ?? null,
            briefLanguageMode: profile.briefLanguageMode ?? "formal",
            locationCount: profile.locationCount ?? 1,
            roleStates: profile.roleStates ?? {},
            updatedAt: new Date()
          }
        })
        .returning()
    );
    if (saved && saved.length > 0) return toWorkspaceProfile(saved[0]);
    return store.saveWorkspaceProfile(profile);
  },

  // ---------------------------------------------------------------------------
  // Learning signals (U4)
  // ---------------------------------------------------------------------------

  async saveLearnningSignal(workspaceId: string, input: LearningSignalInput, actor: string): Promise<LearningSignal> {
    const id = `lsig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const record = {
      id,
      workspaceId,
      agentId: input.agentId,
      outputId: input.outputId,
      signalType: input.signalType,
      editedContent: input.editedContent ?? null,
      actor,
      createdAt: now
    };

    const db = await runDb((db) =>
      db.insert(learningSignals).values(record).returning()
    );

    const row = db && db.length > 0 ? db[0] : null;

    // Audit event
    await runDb((db) =>
      db.insert(auditEvents).values({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        type: "agent_learning_signal",
        actor,
        payload: {
          agentId: input.agentId,
          outputId: input.outputId,
          signalType: input.signalType,
          hasEdit: !!input.editedContent
        },
        createdAt: now
      })
    ).catch(() => null);

    const result: LearningSignal = {
      id,
      workspaceId,
      agentId: input.agentId,
      outputId: input.outputId,
      signalType: input.signalType,
      editedContent: row?.editedContent ?? input.editedContent ?? null,
      actor,
      createdAt: now.toISOString()
    };

    store.saveLearningSignal(result);
    return result;
  },

  async listLearningSignals(input: {
    workspaceId: string;
    agentId?: string;
    outputId?: string;
    signalType?: string;
    since?: string;
    limit?: number;
  }): Promise<LearningSignal[]> {
    const limit = Math.min(200, input.limit ?? 100);
    const rows = await runDb((db) =>
      db
        .select()
        .from(learningSignals)
        .where(
          sql`${learningSignals.workspaceId} = ${input.workspaceId}
            ${input.agentId  ? sql`AND ${learningSignals.agentId}   = ${input.agentId}`   : sql``}
            ${input.outputId ? sql`AND ${learningSignals.outputId}  = ${input.outputId}`  : sql``}
            ${input.signalType ? sql`AND ${learningSignals.signalType} = ${input.signalType}` : sql``}
            ${input.since    ? sql`AND ${learningSignals.createdAt} >= ${new Date(input.since)}` : sql``}`
        )
        .orderBy(desc(learningSignals.createdAt))
        .limit(limit)
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id:            r.id,
        workspaceId:   r.workspaceId,
        agentId:       r.agentId,
        outputId:      r.outputId,
        signalType:    r.signalType as LearningSignal["signalType"],
        editedContent: r.editedContent ?? null,
        actor:         r.actor,
        createdAt:     r.createdAt.toISOString()
      }));
    }
    return store.listLearningSignals(input);
  },

  async getLearningSignalSummary(workspaceId: string, agentId?: string): Promise<LearningSignalSummary[]> {
    const signals = await repository.listLearningSignals({ workspaceId, agentId, limit: 1000 });
    const byAgent = new Map<string, LearningSignal[]>();
    for (const s of signals) {
      const list = byAgent.get(s.agentId) ?? [];
      list.push(s);
      byAgent.set(s.agentId, list);
    }
    return Array.from(byAgent.entries()).map(([aid, list]) => {
      const total     = list.length;
      const approvals = list.filter((s) => s.signalType === "approve" || s.signalType === "thumbs_up").length;
      const edits     = list.filter((s) => s.signalType === "edit").length;
      const rejections = list.filter((s) => s.signalType === "reject" || s.signalType === "thumbs_down").length;
      const thumbsUp  = list.filter((s) => s.signalType === "thumbs_up").length;
      const thumbsDown = list.filter((s) => s.signalType === "thumbs_down").length;
      return {
        agentId:       aid,
        totalSignals:  total,
        approvals,
        edits,
        rejections,
        thumbsUp,
        thumbsDown,
        approvalRate:  total > 0 ? approvals / total : 0,
        rejectionRate: total > 0 ? rejections / total : 0,
        editRate:      total > 0 ? edits / total : 0
      };
    });
  },

  // ---------------------------------------------------------------------------
  // Dispatch job queue
  // ---------------------------------------------------------------------------

  async enqueueDispatchJob(workspaceId: string, input: DispatchJobInput): Promise<DispatchJob> {
    const id = crypto.randomUUID();
    const runAfter = input.runAfter ? new Date(input.runAfter) : new Date();

    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.insert(dispatchJobs).values({
        id,
        workspaceId,
        jobType: input.jobType,
        payload: input.payload ?? {},
        status: "pending",
        priority: input.priority ?? 5,
        maxAttempts: input.maxAttempts ?? 3,
        runAfter,
        parentJobId: input.parentJobId ?? null,
      }).returning();
      return mapDispatchJob(rows[0]);
    }

    const job: DispatchJob = {
      id,
      workspaceId,
      jobType: input.jobType as DispatchJob["jobType"],
      payload: input.payload ?? {},
      status: "pending",
      priority: input.priority ?? 5,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      runAfter: runAfter.toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      parentJobId: input.parentJobId ?? null,
      createdAt: new Date().toISOString(),
    };
    store.dispatchJobs = store.dispatchJobs ?? [];
    (store.dispatchJobs as DispatchJob[]).push(job);
    return job;
  },

  async claimPendingJob(): Promise<DispatchJob | null> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.execute(sql`
        UPDATE dispatch_jobs
        SET status = 'running', started_at = NOW(), attempts = attempts + 1
        WHERE id = (
          SELECT id FROM dispatch_jobs
          WHERE status = 'pending'
            AND run_after <= NOW()
          ORDER BY priority ASC, run_after ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `);
      if (!rows.rows || rows.rows.length === 0) return null;
      return mapDispatchJobRaw(rows.rows[0] as Record<string, unknown>);
    }

    const jobs = (store.dispatchJobs ?? []) as DispatchJob[];
    const now = new Date();
    const pending = jobs
      .filter(j => j.status === "pending" && new Date(j.runAfter) <= now)
      .sort((a, b) => a.priority - b.priority || new Date(a.runAfter).getTime() - new Date(b.runAfter).getTime());
    if (pending.length === 0) return null;
    const job = pending[0];
    job.status = "running";
    job.startedAt = now.toISOString();
    job.attempts = (job.attempts ?? 0) + 1;
    return { ...job };
  },

  async markJobDone(jobId: string): Promise<void> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      await db.update(dispatchJobs)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(dispatchJobs.id, jobId));
      return;
    }
    const job = ((store.dispatchJobs ?? []) as DispatchJob[]).find(j => j.id === jobId);
    if (job) { job.status = "done"; job.completedAt = new Date().toISOString(); }
  },

  async markJobFailed(jobId: string, error: string, retryAfterMs?: number): Promise<void> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.select().from(dispatchJobs).where(eq(dispatchJobs.id, jobId)).limit(1);
      if (rows.length === 0) return;
      const row = rows[0];
      const exhausted = row.attempts >= row.maxAttempts;
      if (exhausted) {
        await db.update(dispatchJobs)
          .set({ status: "failed", completedAt: new Date(), error })
          .where(eq(dispatchJobs.id, jobId));
      } else {
        const delay = retryAfterMs ?? backoffMs(row.attempts);
        await db.update(dispatchJobs)
          .set({ status: "pending", error, runAfter: new Date(Date.now() + delay) })
          .where(eq(dispatchJobs.id, jobId));
      }
      return;
    }
    const job = ((store.dispatchJobs ?? []) as DispatchJob[]).find(j => j.id === jobId);
    if (!job) return;
    if (job.attempts >= job.maxAttempts) {
      job.status = "failed"; job.completedAt = new Date().toISOString(); job.error = error;
    } else {
      const delay = retryAfterMs ?? backoffMs(job.attempts);
      job.status = "pending"; job.error = error;
      job.runAfter = new Date(Date.now() + delay).toISOString();
    }
  },

  async listDispatchJobs(workspaceId: string, opts?: {
    status?: DispatchJobStatus;
    jobType?: string;
    limit?: number;
    offset?: number;
  }): Promise<DispatchJob[]> {
    const limit  = opts?.limit  ?? 20;
    const offset = opts?.offset ?? 0;

    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.execute(sql`
        SELECT * FROM dispatch_jobs
        WHERE workspace_id = ${workspaceId}
          ${opts?.status  ? sql`AND status   = ${opts.status}`  : sql``}
          ${opts?.jobType ? sql`AND job_type = ${opts.jobType}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return (rows.rows as Record<string, unknown>[]).map(mapDispatchJobRaw);
    }

    let jobs = ((store.dispatchJobs ?? []) as DispatchJob[]).filter(j => j.workspaceId === workspaceId);
    if (opts?.status)  jobs = jobs.filter(j => j.status  === opts.status);
    if (opts?.jobType) jobs = jobs.filter(j => j.jobType === opts.jobType);
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return jobs.slice(offset, offset + limit);
  },

  async getDispatchJob(jobId: string): Promise<DispatchJob | null> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.select().from(dispatchJobs).where(eq(dispatchJobs.id, jobId)).limit(1);
      if (rows.length === 0) return null;
      return mapDispatchJob(rows[0]);
    }
    return ((store.dispatchJobs ?? []) as DispatchJob[]).find(j => j.id === jobId) ?? null;
  },

  async cancelJob(jobId: string): Promise<void> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      await db.update(dispatchJobs)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(eq(dispatchJobs.id, jobId));
      return;
    }
    const job = ((store.dispatchJobs ?? []) as DispatchJob[]).find(j => j.id === jobId);
    if (job) { job.status = "cancelled"; job.completedAt = new Date().toISOString(); }
  },

  async countPendingJobs(workspaceId?: string): Promise<number> {
    if (isDbRequired()) {
      const db = getDb();
      if (!db) throw new Error("database_required");
      const rows = await db.execute(sql`
        SELECT COUNT(*) as count FROM dispatch_jobs
        WHERE status = 'pending'
          ${workspaceId ? sql`AND workspace_id = ${workspaceId}` : sql``}
      `);
      return Number((rows.rows[0] as Record<string, unknown>)?.count ?? 0);
    }
    return ((store.dispatchJobs ?? []) as DispatchJob[]).filter(j =>
      j.status === "pending" && (!workspaceId || j.workspaceId === workspaceId)
    ).length;
  },

  // ---------------------------------------------------------------------------
  // Stripe webhook idempotency
  // ---------------------------------------------------------------------------

  /**
   * Attempt to record a Stripe event ID as processed.
   * Returns true if the event is new (insert succeeded) and should be processed.
   * Returns false if the event was already processed (duplicate — skip it).
   *
   * Uses INSERT ... ON CONFLICT DO NOTHING so the operation is always safe
   * to call without a try/catch on the caller side.
   */
  async markStripeEventProcessed(eventId: string, eventType: string): Promise<boolean> {
    const db = getDb();
    if (!db) {
      // No DB — in-memory mode: use a module-level set so restarts clear it
      // (acceptable: Stripe retries only matter in production where DB is wired)
      if (!stripeProcessedEventCache.has(eventId)) {
        stripeProcessedEventCache.add(eventId);
        return true;
      }
      return false;
    }
    const result = await db.execute(sql`
      INSERT INTO stripe_processed_events (event_id, event_type, processed_at)
      VALUES (${eventId}, ${eventType}, NOW())
      ON CONFLICT (event_id) DO NOTHING
    `);
    // rowCount > 0 means the insert succeeded (event is new)
    return (result.rowCount ?? 0) > 0;
  },

  // -------------------------------------------------------------------------
  // Strategy profile (migration 0027)
  // -------------------------------------------------------------------------

  async getStrategyProfile(workspaceId: string): Promise<StrategyProfile | null> {
    const rows = await runDb((db) =>
      db.select().from(strategyProfiles).where(eq(strategyProfiles.workspaceId, workspaceId)).limit(1)
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        workspaceId: r.workspaceId,
        buyerLane: (r.buyerLane ?? "evaluator") as StrategyProfile["buyerLane"],
        role: r.role ?? null,
        sector: r.sector ?? null,
        companySize: r.companySize ?? null,
        priority: (r.priority ?? "medium") as StrategyProfile["priority"],
        sponsorName: r.sponsorName ?? null,
        sponsorEmail: r.sponsorEmail ?? null,
        reviewerName: r.reviewerName ?? null,
        reviewerEmail: r.reviewerEmail ?? null,
        governancePosture: (r.governancePosture ?? "standard") as StrategyProfile["governancePosture"],
        selectedWorkflow: r.selectedWorkflow ?? null,
        readinessScores: (r.readinessScores ?? {}) as StrategyProfile["readinessScores"],
        readinessBand: r.readinessBand ?? null,
        externalRef: r.externalRef ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      };
    }
    return null;
  },

  async upsertStrategyProfile(
    workspaceId: string,
    input: StrategyProfileInput
  ): Promise<StrategyProfile> {
    const existing = await repository.getStrategyProfile(workspaceId);
    const now = new Date();
    const id = existing?.id ?? `sp_${workspaceId}`;

    const profile: StrategyProfile = {
      id,
      workspaceId,
      buyerLane: (input.buyerLane ?? existing?.buyerLane ?? "evaluator") as StrategyProfile["buyerLane"],
      role: input.role ?? existing?.role ?? null,
      sector: input.sector ?? existing?.sector ?? null,
      companySize: input.companySize ?? existing?.companySize ?? null,
      priority: (input.priority ?? existing?.priority ?? "medium") as StrategyProfile["priority"],
      sponsorName: input.sponsorName ?? existing?.sponsorName ?? null,
      sponsorEmail: input.sponsorEmail ?? existing?.sponsorEmail ?? null,
      reviewerName: input.reviewerName ?? existing?.reviewerName ?? null,
      reviewerEmail: input.reviewerEmail ?? existing?.reviewerEmail ?? null,
      governancePosture: (input.governancePosture ?? existing?.governancePosture ?? "standard") as StrategyProfile["governancePosture"],
      selectedWorkflow: input.selectedWorkflow ?? existing?.selectedWorkflow ?? null,
      readinessScores: input.readinessScores ?? existing?.readinessScores ?? {},
      readinessBand: input.readinessBand ?? existing?.readinessBand ?? null,
      externalRef: input.externalRef ?? existing?.externalRef ?? null,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await runDb(async (db) => {
      await db
        .insert(strategyProfiles)
        .values({
          id: profile.id,
          workspaceId: profile.workspaceId,
          buyerLane: profile.buyerLane,
          role: profile.role,
          sector: profile.sector,
          companySize: profile.companySize,
          priority: profile.priority,
          sponsorName: profile.sponsorName,
          sponsorEmail: profile.sponsorEmail,
          reviewerName: profile.reviewerName,
          reviewerEmail: profile.reviewerEmail,
          governancePosture: profile.governancePosture,
          selectedWorkflow: profile.selectedWorkflow,
          readinessScores: profile.readinessScores,
          readinessBand: profile.readinessBand,
          externalRef: profile.externalRef,
          createdAt: new Date(profile.createdAt),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: strategyProfiles.workspaceId,
          set: {
            buyerLane: profile.buyerLane,
            role: profile.role,
            sector: profile.sector,
            companySize: profile.companySize,
            priority: profile.priority,
            sponsorName: profile.sponsorName,
            sponsorEmail: profile.sponsorEmail,
            reviewerName: profile.reviewerName,
            reviewerEmail: profile.reviewerEmail,
            governancePosture: profile.governancePosture,
            selectedWorkflow: profile.selectedWorkflow,
            readinessScores: profile.readinessScores,
            readinessBand: profile.readinessBand,
            externalRef: profile.externalRef,
            updatedAt: now,
          },
        });
    });

    void repository.pushAudit({
      workspaceId,
      type: "strategy_profile_updated",
      actor: "system",
      payload: {
        buyerLane: profile.buyerLane,
        role: profile.role,
        sector: profile.sector,
        selectedWorkflow: profile.selectedWorkflow,
        readinessBand: profile.readinessBand,
      },
    }).catch(() => {});

    return profile;
  },

  async storeKnowledgeEmbedding(noteId: string, embedding: number[]): Promise<void> {
    await runDb((db) =>
      db.update(knowledgeNotes)
        .set({ embedding: sql`${JSON.stringify(embedding)}::vector` as unknown as number[] })
        .where(eq(knowledgeNotes.id, noteId))
    ).catch(() => {});
  },

  async searchKnowledgeVector(workspaceId: string, queryVector: number[], limit = 10): Promise<KnowledgeNote[]> {
    const rows = await runDb(async (db) => {
      const results = await db.execute(sql`
        SELECT kn.*
        FROM knowledge_notes kn
        WHERE kn.workspace_id = ${workspaceId}
          AND kn.status = 'active'
          AND kn.embedding IS NOT NULL
        ORDER BY kn.embedding <=> ${JSON.stringify(queryVector)}::vector
        LIMIT ${limit}
      `);
      return (results?.rows ?? []) as Array<Record<string, unknown>>;
    });
    if (!rows || !rows.length) return [];
    return rows.map((r) => toKnowledgeNote(r as typeof knowledgeNotes.$inferSelect));
  },
};
