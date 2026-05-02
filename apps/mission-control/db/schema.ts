import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";

const vector = (name: string) => jsonb(name).$type<number[]>();

export const sensitivityEnum = pgEnum("sensitivity", ["public", "internal", "confidential", "restricted"]);
export const ingestionStatusEnum = pgEnum("ingestion_status", ["queued", "triaged", "pending_approval", "quarantined", "processed", "failed"]);
export const recommendationStatusEnum = pgEnum("recommendation_status", ["draft", "in_review", "approved", "rejected", "promoted"]);
export const decisionStatusEnum = pgEnum("decision_status", ["open", "decided", "superseded"]);

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  active: boolean("active").notNull().default(true)
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  role: varchar("role", { length: 64 }).notNull()
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  sourcePath: text("source_path").notNull(),
  sourceUri: text("source_uri"),
  active: boolean("active").notNull().default(true)
});

export const evidenceRecords = pgTable("evidence_records", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  sourceId: text("source_id"),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  sourcePath: text("source_path").notNull(),
  sourceUri: text("source_uri"),
  sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
  hash: varchar("hash", { length: 128 }).notNull(),
  sensitivity: sensitivityEnum("sensitivity").notNull(),
  extractionConfidence: integer("extraction_confidence").notNull(),
  ingestionStatus: ingestionStatusEnum("ingestion_status").notNull(),
  freshnessHours: integer("freshness_hours").notNull().default(0),
  body: text("body").notNull(),
  embedding: vector("embedding")
});

export const entities = pgTable("entities", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  metadata: jsonb("metadata")
});

export const recommendations = pgTable("recommendations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  owner: varchar("owner", { length: 120 }).notNull(),
  status: recommendationStatusEnum("status").notNull(),
  confidence: integer("confidence").notNull(),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().default([]).notNull(),
  affectedEntityIds: jsonb("affected_entity_ids").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const agentKeys = pgTable("agent_keys", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  prefix: varchar("prefix", { length: 8 }).notNull(),
  keyHash: text("key_hash").notNull(),
  scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workspaceSettings = pgTable("workspace_settings", {
  workspaceId: text("workspace_id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  llmProvider: varchar("llm_provider", { length: 64 }).notNull().default("anthropic"),
  llmModel: varchar("llm_model", { length: 120 }).notNull().default("claude-opus-4-6"),
  quarantineThreshold: integer("quarantine_threshold").notNull().default(55),
  defaultSensitivity: sensitivityEnum("default_sensitivity").notNull().default("internal"),
  slackEnabled: boolean("slack_enabled").notNull().default(false),
  teamsEnabled: boolean("teams_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  owner: varchar("owner", { length: 120 }).notNull(),
  rationale: text("rationale").notNull(),
  status: decisionStatusEnum("status").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true })
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  approvedBy: text("approved_by").notNull(),
  approved: boolean("approved").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: varchar("type", { length: 120 }).notNull(),
  actor: varchar("actor", { length: 120 }).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * Connector installs — one row per (workspace, connector type) pair.
 * Credentials are stored AES-256-GCM encrypted; the plaintext never persists.
 * config holds non-secret settings (selected channels, folder IDs, etc.).
 */
export const connectors = pgTable("connectors", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),  // slack | google_drive | sharepoint | upload
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending | active | error | revoked
  installedBy: text("installed_by").notNull(),
  installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncError: text("sync_error"),
  encryptedCredentials: text("encrypted_credentials"),  // AES-256-GCM encrypted JSON blob
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull()
});
