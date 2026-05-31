import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { verifyPassword } from "@/lib/auth";
import { store } from "@/lib/data/store";
import type { AgentKey, AgentKeyCreated, AgentScope, EvidenceRecord, IngestionStatus, Recommendation, RecommendationStatus, Role, WorkspaceProfile, WorkspaceSettings } from "@/lib/contracts";
import { assertDbConfigured, isDbRequired } from "@/lib/data/db-policy";
import { normalizeDatabaseUrl } from "@/lib/data/postgres-url";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";
import { buildDefaultAgentControlProfile, buildDefaultAgentControlProfiles } from "@/lib/agents/default-passports";
import type { AgentControlProfile, AgentControlProfileInput } from "@/lib/contracts";
import {
  agentControlProfiles,
  agentKeys,
  auditEvents,
  connectors,
  evidenceRecords,
  llmUsage,
  recommendations,
  roles,
  tenants,
  users,
  workspaces,
  workspaceProfiles,
  workspaceSettings,
  type recommendationStatusEnum,
  type ingestionStatusEnum
} from "@/db/schema";

export type WorkspaceStatus = "trial" | "pilot" | "active" | "suspended" | "cancelled";

export type WorkspaceStatusRecord = {
  status: WorkspaceStatus;
  trialEndsAt: string | null;
  suspendedAt: string | null;
};

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
    sourceType: row.sourceType,
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

    const memoryProfile = store.getActiveAgentControlProfile(workspaceId, agentKey);
    if (memoryProfile) return memoryProfile;

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

  getConversation(workspaceId: string, userId: string) {
    return store.getConversation(workspaceId, userId);
  },

  appendConversation(workspaceId: string, userId: string, role: "user" | "assistant", text: string) {
    store.appendConversation(workspaceId, userId, role, text);
  },

  checkSlackSafety(text: string, refs: string[]) {
    return store.checkSlackSafety(text, refs);
  },

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
        demoMode: r.demoMode ?? false,
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
          demoMode: next.demoMode ?? false,
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
            demoMode: next.demoMode ?? false,
            updatedAt: new Date()
          }
        });
    });

    store.updateWorkspaceSettings(workspaceId, next);
    return next;
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
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1)
    );
    if (!rows || rows.length === 0) {
      return { status: "active", trialEndsAt: null, suspendedAt: null };
    }
    const row = rows[0];
    return {
      status: (row.status ?? "active") as WorkspaceStatus,
      trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
      suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
    };
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
    limit = 6
  ): Promise<EvidenceRecord[]> {
    const rows = await runDb((db) =>
      db
        .select()
        .from(evidenceRecords)
        .where(
          sql`${evidenceRecords.workspaceId} = ${workspaceId}
            AND ${evidenceRecords.ingestionStatus} = 'processed'
            AND ${evidenceRecords.sensitivity} <> 'restricted'
            AND ${evidenceRecords.embedding} IS NOT NULL`
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
  }
};
