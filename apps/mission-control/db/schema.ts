import {
  bigint,
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
export const knowledgeNoteStatusEnum = pgEnum("knowledge_note_status", ["active", "archived", "deleted"]);
export const knowledgeSourceKindEnum = pgEnum("knowledge_source_kind", ["manual", "import", "sync", "automation", "mcp"]);
export const knowledgeLinkTypeEnum = pgEnum("knowledge_link_type", ["note", "evidence", "entity", "workflow_twin", "decision", "recommendation"]);
export const agentControlStatusEnum = pgEnum("agent_control_status", ["draft", "active", "suspended"]);
export const actionRightEnum = pgEnum("action_right", ["retrieve", "summarize", "draft", "recommend", "prepare_for_approval"]);
export const riskRatingEnum = pgEnum("agent_risk_rating", ["low", "medium", "high", "regulated"]);
export const approvalLevelEnum = pgEnum("agent_approval_level", ["owner", "partner", "client", "board"]);
export const reviewCadenceEnum = pgEnum("agent_review_cadence", ["per_output", "weekly", "monthly", "event"]);
export const agentLogLevelEnum = pgEnum("agent_log_level", ["actions", "actions_sources", "full"]);
export const planEnum = pgEnum("plan", ["free", "pro", "business", "enterprise"]);

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
  /** Time-boxed workspace deadline (Vantage per-deal, Meridian per-submission
   * workspaces). Distinct from trialEndsAt: this is a deliberate business
   * deadline, not a billing trial. When passed, convertExpiredWorkspaces()
   * suspends the workspace; actual data deletion is a separate, deliberate
   * action (purgeWorkspaceData) — never automatic. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: varchar("plan", { length: 32 }).notNull().default("free"),
  monthlyTokenLimit: bigint("monthly_token_limit", { mode: "number" }).notNull().default(500000),
  monthlyTokenUsed: bigint("monthly_token_used", { mode: "number" }).notNull().default(0),
  tokenResetAt: timestamp("token_reset_at", { withTimezone: true }).notNull().defaultNow(),
  planChangedAt: timestamp("plan_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const planDefinitions = pgTable("plan_definitions", {
  planKey: varchar("plan_key", { length: 32 }).primaryKey(),
  label: varchar("label", { length: 64 }).notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  monthlyTokens: bigint("monthly_tokens", { mode: "number" }).notNull(),
  maxRoles: integer("max_roles").notNull(),
  maxEvidence: integer("max_evidence").notNull(),
  maxTeam: integer("max_team").notNull(),
  maxConnectors: integer("max_connectors").notNull(),
  maxApiKeys: integer("max_api_keys").notNull(),
  askDailyLimit: integer("ask_daily_limit"),
  scheduledSynthesis: boolean("scheduled_synthesis").notNull().default(false),
  synthesisMaxCadence: varchar("synthesis_max_cadence", { length: 16 }),
  emailDelivery: boolean("email_delivery").notNull().default(false),
  slackDelivery: boolean("slack_delivery").notNull().default(false),
  exportsEnabled: boolean("exports_enabled").notNull().default(false),
  decisionExtraction: boolean("decision_extraction").notNull().default(false),
  customPassports: boolean("custom_passports").notNull().default(false),
  dataResidency: boolean("data_residency").notNull().default(false),
  apiAccess: boolean("api_access").notNull().default(false),
  watermark: boolean("watermark").notNull().default(true),
  stripePriceId: varchar("stripe_price_id", { length: 128 }),
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

export const knowledgeNotes = pgTable("knowledge_notes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  path: text("path").notNull(),
  body: text("body").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  sensitivity: sensitivityEnum("sensitivity").notNull().default("internal"),
  status: knowledgeNoteStatusEnum("status").notNull().default("active"),
  sourceKind: knowledgeSourceKindEnum("source_kind").notNull().default("manual"),
  frontmatter: jsonb("frontmatter").$type<Record<string, unknown>>().default({}).notNull(),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().default([]).notNull(),
  entityRefs: jsonb("entity_refs").$type<string[]>().default([]).notNull(),
  workflowRefs: jsonb("workflow_refs").$type<string[]>().default([]).notNull(),
  decisionRefs: jsonb("decision_refs").$type<string[]>().default([]).notNull(),
  recommendationRefs: jsonb("recommendation_refs").$type<string[]>().default([]).notNull(),
  embedding: vector("embedding"),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const knowledgeLinks = pgTable("knowledge_links", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sourceNoteId: text("source_note_id").notNull().references(() => knowledgeNotes.id, { onDelete: "cascade" }),
  targetType: knowledgeLinkTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const knowledgeSyncEvents = pgTable("knowledge_sync_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  path: text("path"),
  noteId: text("note_id"),
  status: varchar("status", { length: 40 }).notNull(),
  message: text("message"),
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
  /** Level-3 white-label brand override (Nucleus client deployments only).
   * Swaps ONLY logo/accent/font — core status colours and trust patterns are
   * never part of this override. Null = use Pinavia default branding. */
  whiteLabelBrand: jsonb("white_label_brand").$type<{
    logoUrl: string | null;
    accentColor: string | null;
    fontFamily: string | null;
  }>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const synthesisSchedules = pgTable("synthesis_schedules", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  cron: varchar("cron", { length: 64 }).notNull().default("0 7 * * 1"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  roles: jsonb("roles").$type<string[]>().default(["ceo"]).notNull(),
  delivery: jsonb("delivery").$type<string[]>().default(["in_app"]).notNull(),
  emailTargets: jsonb("email_targets").$type<string[]>().default([]).notNull(),
  slackChannel: text("slack_channel"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: varchar("last_status", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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

export const workflowTwins = pgTable("workflow_twins", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  owner: varchar("owner", { length: 120 }),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const workflowTwinRuns = pgTable("workflow_twin_runs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  twinId: text("twin_id").notNull().references(() => workflowTwins.id, { onDelete: "cascade" }),
  twinType: varchar("twin_type", { length: 64 }).notNull(),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().default([]).notNull(),
  generatedOutputRefs: jsonb("generated_output_refs").$type<string[]>().default([]).notNull(),
  confidence: integer("confidence").notNull().default(70),
  status: varchar("status", { length: 32 }).notNull().default("generated"),
  summary: text("summary").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
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

/**
 * Orchestration dispatcher job queue (migration 0024).
 * Decouples job submission from execution. Supports priority, retry, and chaining.
 * Claims are atomic via SQL FOR UPDATE SKIP LOCKED.
 */
export const dispatchJobs = pgTable("dispatch_jobs", {
  id:           text("id").primaryKey(),
  workspaceId:  text("workspace_id").notNull(),
  jobType:      varchar("job_type", { length: 64 }).notNull(),
  payload:      jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status:       varchar("status", { length: 16 }).notNull().default("pending"),
  priority:     integer("priority").notNull().default(5),
  attempts:     integer("attempts").notNull().default(0),
  maxAttempts:  integer("max_attempts").notNull().default(3),
  runAfter:     timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  startedAt:    timestamp("started_at", { withTimezone: true }),
  completedAt:  timestamp("completed_at", { withTimezone: true }),
  error:        text("error"),
  parentJobId:  text("parent_job_id"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * stripe_processed_events — idempotency guard for Stripe webhook delivery.
 * We insert the event ID before acting; a duplicate insert (unique PK violation)
 * means the event was already handled and we can skip processing safely.
 * Stripe's max redelivery window is 3 days; rows older than 30 days can be pruned.
 */
export const stripeProcessedEvents = pgTable("stripe_processed_events", {
  eventId:     varchar("event_id", { length: 255 }).primaryKey(),
  eventType:   varchar("event_type", { length: 128 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Strategy profile — persisted readiness and buyer-lane context per workspace.
 * Migration 0027. Connected to public /readiness assessment and onboarding routing.
 */
export const strategyProfiles = pgTable("strategy_profiles", {
  id:                text("id").primaryKey(),
  workspaceId:       text("workspace_id").notNull(),
  buyerLane:         varchar("buyer_lane", { length: 32 }).notNull().default("evaluator"),
  role:              varchar("role", { length: 64 }),
  sector:            varchar("sector", { length: 64 }),
  companySize:       varchar("company_size", { length: 32 }),
  priority:          varchar("priority", { length: 16 }).default("medium"),
  sponsorName:       varchar("sponsor_name", { length: 128 }),
  sponsorEmail:      varchar("sponsor_email", { length: 255 }),
  reviewerName:      varchar("reviewer_name", { length: 128 }),
  reviewerEmail:     varchar("reviewer_email", { length: 255 }),
  governancePosture: varchar("governance_posture", { length: 32 }).default("standard"),
  selectedWorkflow:  varchar("selected_workflow", { length: 64 }),
  readinessScores:   jsonb("readiness_scores").$type<Record<string, number>>().default({}),
  readinessBand:     varchar("readiness_band", { length: 16 }),
  externalRef:       varchar("external_ref", { length: 255 }),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
