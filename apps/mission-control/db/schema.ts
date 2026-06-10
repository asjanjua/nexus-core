import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";

/**
 * Real pgvector column type for Drizzle ORM.
 *
 * Postgres stores vectors as "[0.1,0.2,...]" strings via the pgvector extension.
 * This customType handles encoding (JS number[] → Postgres "[...]") and decoding
 * (Postgres string → JS number[]) transparently at the ORM layer.
 *
 * Migration 0007 switches the evidence_records.embedding column from JSONB to
 * vector(1536) and builds an HNSW index. Until that migration runs, the column
 * does not exist in the DB — all embedding writes/reads are no-ops.
 *
 * Dimensions: 1536 matches OpenAI text-embedding-3-small output.
 */
const pgVector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return config?.dimensions ? `vector(${config.dimensions})` : "vector";
  },
  fromDriver(value: string): number[] {
    // Postgres returns vector as "[0.1,0.2,...]"
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map(Number);
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  }
});

// Alias kept for readability at the column definition site.
const vector = (name: string) => pgVector(name, { dimensions: 1536 });

export const sensitivityEnum = pgEnum("sensitivity", ["public", "internal", "confidential", "restricted"]);
export const workspaceStatusEnum = pgEnum("workspace_status", ["trial", "pilot", "active", "suspended", "cancelled"]);
export const ingestionStatusEnum = pgEnum("ingestion_status", ["queued", "triaged", "pending_approval", "quarantined", "processed", "failed"]);
export const recommendationStatusEnum = pgEnum("recommendation_status", ["draft", "in_review", "approved", "rejected", "promoted"]);
export const decisionStatusEnum = pgEnum("decision_status", ["open", "decided", "superseded"]);
export const agentControlStatusEnum = pgEnum("agent_control_status", ["draft", "active", "suspended"]);
export const actionRightEnum = pgEnum("action_right", ["retrieve", "summarize", "draft", "recommend", "prepare_for_approval"]);
export const riskRatingEnum = pgEnum("agent_risk_rating", ["low", "medium", "high", "regulated"]);
export const approvalLevelEnum = pgEnum("agent_approval_level", ["owner", "partner", "client", "board"]);
export const reviewCadenceEnum = pgEnum("agent_review_cadence", ["per_output", "weekly", "monthly", "event"]);
export const agentLogLevelEnum = pgEnum("agent_log_level", ["actions", "actions_sources", "full"]);

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  status: workspaceStatusEnum("status").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
  department: varchar("department", { length: 120 }),
  connectorInstanceId: text("connector_instance_id"),
  sourcePath: text("source_path").notNull(),
  sourceUri: text("source_uri"),
  sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
  hash: varchar("hash", { length: 128 }).notNull(),
  sensitivity: sensitivityEnum("sensitivity").notNull(),
  // Stored as a 0-100 integer percentage to keep comparisons/indexing simple.
  // The application contract exposes this as a 0-1 float.
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

export const evidenceEntityLinks = pgTable("evidence_entity_links", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  evidenceId: text("evidence_id").notNull().references(() => evidenceRecords.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  confidence: integer("confidence").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const recommendations = pgTable("recommendations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  owner: varchar("owner", { length: 120 }).notNull(),
  status: recommendationStatusEnum("status").notNull(),
  // Stored as a 0-100 integer percentage. The application contract exposes 0-1.
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
  allowedProviders: jsonb("allowed_providers").$type<string[]>().default(["anthropic", "deepseek", "openai_compatible"]).notNull(),
  localOnlyMode: boolean("local_only_mode").notNull().default(false),
  sensitivityCeiling: sensitivityEnum("sensitivity_ceiling").notNull().default("confidential"),
  approvalRequiredThreshold: integer("approval_required_threshold").notNull().default(70),
  /** Demo mode: disables real ingestion and shows a "Demo" badge. Used during sales demos. */
  demoMode: boolean("demo_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const promptRegistry = pgTable("prompt_registry", {
  key: text("key").primaryKey(),
  version: varchar("version", { length: 32 }).notNull(),
  owner: varchar("owner", { length: 120 }).notNull(),
  description: text("description").notNull(),
  template: text("template").notNull(),
  changelog: jsonb("changelog").$type<string[]>().default([]).notNull(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull()
});

export const evalRuns = pgTable("eval_runs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  total: integer("total").notNull(),
  passed: integer("passed").notNull(),
  failed: integer("failed").notNull(),
  passRate: integer("pass_rate").notNull(),
  avgConfidence: integer("avg_confidence").notNull(),
  avgLatencyMs: integer("avg_latency_ms").notNull(),
  results: jsonb("results").$type<Record<string, unknown>[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const decisions = pgTable("decisions", {
  id:             text("id").primaryKey(),
  workspaceId:    text("workspace_id").notNull(),
  title:          text("title").notNull(),
  owner:          varchar("owner", { length: 120 }).notNull(),
  rationale:      text("rationale").notNull(),
  status:         decisionStatusEnum("status").notNull().default("open"),
  sourceOutputId: text("source_output_id").references(() => agentOutputs.id, { onDelete: "set null" }),
  deadline:       timestamp("deadline", { withTimezone: true }),
  priority:       varchar("priority", { length: 16 }).notNull().default("medium"), // low | medium | high | critical
  decidedAt:      timestamp("decided_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const actionStatusEnum = pgEnum("action_status", ["open", "done", "deferred", "cancelled"]);

export const actions = pgTable("actions", {
  id:          text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  decisionId:  text("decision_id").notNull().references(() => decisions.id, { onDelete: "cascade" }),
  actionText:  text("action_text").notNull(),
  owner:       varchar("owner", { length: 120 }).notNull(),
  dueDate:     timestamp("due_date", { withTimezone: true }),
  isBlocker:   boolean("is_blocker").notNull().default(false),
  status:      actionStatusEnum("status").notNull().default("open"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const askConversationMessages = pgTable("ask_conversation_messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
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

export const agentOutputs = pgTable("agent_outputs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  agentId: varchar("agent_id", { length: 120 }).notNull(),
  agentVersion: integer("agent_version").notNull().default(1),
  roleKey: varchar("role_key", { length: 64 }).notNull(),
  content: text("content").notNull(),
  inputSummary: text("input_summary").notNull(),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().default([]).notNull(),
  confidence: integer("confidence").notNull(),
  outputVersion: integer("output_version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  replacedById: text("replaced_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const agentControlProfiles = pgTable("agent_control_profiles", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  agentKey: varchar("agent_key", { length: 120 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  purpose: text("purpose").notNull(),
  version: integer("version").notNull().default(1),
  status: agentControlStatusEnum("status").notNull().default("draft"),
  allowedScopes: jsonb("allowed_scopes").$type<string[]>().default([]).notNull(),
  forbiddenScopes: jsonb("forbidden_scopes").$type<string[]>().default([]).notNull(),
  maxSensitivity: sensitivityEnum("max_sensitivity").notNull().default("internal"),
  crossEntityAccess: boolean("cross_entity_access").notNull().default(false),
  allowedTools: jsonb("allowed_tools").$type<string[]>().default([]).notNull(),
  forbiddenTools: jsonb("forbidden_tools").$type<string[]>().default([]).notNull(),
  policyControlledApis: jsonb("policy_controlled_apis").$type<Record<string, unknown>>().default({}).notNull(),
  actionRight: actionRightEnum("action_right").notNull().default("recommend"),
  hardStops: jsonb("hard_stops").$type<string[]>().default([]).notNull(),
  escalationTriggers: jsonb("escalation_triggers").$type<string[]>().default([]).notNull(),
  approvalLevel: approvalLevelEnum("approval_level").notNull().default("owner"),
  riskRating: riskRatingEnum("risk_rating").notNull().default("medium"),
  reviewCadence: reviewCadenceEnum("review_cadence").notNull().default("per_output"),
  watcherAgents: jsonb("watcher_agents").$type<string[]>().default([]).notNull(),
  logLevel: agentLogLevelEnum("log_level").notNull().default("full"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * Workspace profile — one row per workspace, storing company context used to
 * personalise LLM prompts in dashboards, ask, and recommendations.
 */
export const workspaceProfiles = pgTable("workspace_profiles", {
  workspaceId: text("workspace_id").primaryKey(),
  companyName: varchar("company_name", { length: 200 }),
  sector: varchar("sector", { length: 64 }),
  subsector: varchar("subsector", { length: 64 }),
  businessModel: varchar("business_model", { length: 120 }),
  companyStage: varchar("company_stage", { length: 32 }),
  employeeBand: varchar("employee_band", { length: 32 }),
  region: varchar("region", { length: 120 }),
  primaryGoals: jsonb("primary_goals").$type<string[]>().default([]).notNull(),
  riskProfile: varchar("risk_profile", { length: 32 }),
  priorityRoles: jsonb("priority_roles").$type<string[]>().default([]).notNull(),
  companyArchetype: varchar("company_archetype", { length: 64 }),
  archetypeVersion: text("archetype_version"),
  briefLanguageMode: varchar("brief_language_mode", { length: 16 }).notNull().default("formal"),
  locationCount: integer("location_count").notNull().default(1),
  roleStates: jsonb("role_states").$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
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

/**
 * Learning signals — user feedback on agent outputs (approve / edit / reject / thumbs_up / thumbs_down).
 * Every signal is linked to the specific agent_output it was raised against.
 * Drives quality improvement reporting and trend analysis for regulated-sector pilots.
 */
export const learningSignals = pgTable("learning_signals", {
  id:            text("id").primaryKey(),
  workspaceId:   text("workspace_id").notNull(),
  agentId:       varchar("agent_id", { length: 120 }).notNull(),
  outputId:      text("output_id").notNull().references(() => agentOutputs.id, { onDelete: "cascade" }),
  signalType:    varchar("signal_type", { length: 32 }).notNull(), // approve | edit | reject | thumbs_up | thumbs_down
  editedContent: text("edited_content"),                           // only set for signal_type = 'edit'
  actor:         varchar("actor", { length: 120 }).notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/**
 * LLM usage tracking — one row per LLM call, for cost monitoring and per-workspace budget alerts.
 * cost_usd_micro stores cost in millionths of a USD to avoid floating-point storage.
 * e.g. $0.001 = 1000 micro-USD
 */
export const llmUsage = pgTable("llm_usage", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  day: date("day").notNull(),
  model: text("model").notNull(),
  route: text("route").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsdMicro: integer("cost_usd_micro").notNull().default(0),
});
