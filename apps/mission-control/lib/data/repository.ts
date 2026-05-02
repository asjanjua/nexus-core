import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { verifyPassword } from "@/lib/auth";
import { store } from "@/lib/data/store";
import type { AgentKey, AgentKeyCreated, AgentScope, EvidenceRecord, IngestionStatus, Recommendation, RecommendationStatus, Role, WorkspaceSettings } from "@/lib/contracts";
import { assertDbConfigured, isDbRequired } from "@/lib/data/db-policy";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";
import {
  agentKeys,
  auditEvents,
  connectors,
  evidenceRecords,
  recommendations,
  roles,
  tenants,
  users,
  workspaces,
  workspaceSettings,
  type recommendationStatusEnum,
  type ingestionStatusEnum
} from "@/db/schema";

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

function getDb(): DbShape | null {
  if (dbInstance !== undefined) return dbInstance;
  assertDbConfigured();
  const url = process.env.DATABASE_URL;
  if (!url) {
    dbInstance = null;
    return null;
  }
  dbPool = new Pool({ connectionString: url });
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
    sourcePath: row.sourcePath,
    sourceUri: row.sourceUri ?? undefined,
    sourceTimestamp,
    ingestedAt,
    hash: row.hash,
    sensitivity: row.sensitivity,
    extractionConfidence: Number((row.extractionConfidence / 100).toFixed(2)),
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
    confidence: Number((row.confidence / 100).toFixed(2)),
    affectedEntityIds: Array.isArray(row.affectedEntityIds) ? (row.affectedEntityIds as string[]) : [],
    evidenceRefs: Array.isArray(row.evidenceRefs) ? (row.evidenceRefs as string[]) : [],
    createdAt,
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
        sourcePath: record.sourcePath,
        sourceUri: record.sourceUri ?? null,
        sourceTimestamp: new Date(record.sourceTimestamp),
        hash: record.hash,
        sensitivity: record.sensitivity,
        extractionConfidence: Math.round(record.extractionConfidence * 100),
        ingestionStatus: record.ingestionStatus,
        freshnessHours: record.freshnessHours,
        body: record.text
      });
      return true;
    });
    if (!inserted) return store.addEvidenceRecord(record);
    return record;
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

  async getRoleSummary(role: Role): Promise<{
    role: Role;
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
            : "Growth opportunities and partner pipeline";
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
  }
};
