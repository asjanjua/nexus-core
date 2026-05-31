import { z } from "zod";

export const KNOWN_ROLES = new Set(["ceo", "coo", "cbo", "cto"]);
export const roleSchema = z.string().min(1).max(64).regex(/^[a-z0-9_:-]+$/);
export type Role = z.infer<typeof roleSchema>;

export const companyArchetypeSchema = z.enum([
  "corporate",
  "startup_scaleup",
  "sme_physical",
  "digital_native",
  "professional_practice"
]);
export type CompanyArchetype = z.infer<typeof companyArchetypeSchema>;

export const briefLanguageModeSchema = z.enum(["formal", "plain"]);
export type BriefLanguageMode = z.infer<typeof briefLanguageModeSchema>;

export const roleStateSchema = z.enum(["active", "staged", "available", "dual_hat"]);
export type RoleStateStatus = z.infer<typeof roleStateSchema>;

export const workspaceRoleStateSchema = z.object({
  state: roleStateSchema,
  activatedAt: z.string().nullable().optional(),
  stagedCondition: z.string().nullable().optional(),
  dualHatOf: z.string().nullable().optional()
});
export type WorkspaceRoleState = z.infer<typeof workspaceRoleStateSchema>;

export const sensitivitySchema = z.enum(["public", "internal", "confidential", "restricted"]);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

export const ingestionStatusSchema = z.enum([
  "queued",
  "triaged",
  "pending_approval",  // moderate confidence — awaiting human review before LLM synthesis
  "quarantined",       // very low confidence or missing provenance — blocked
  "processed",         // high confidence — cleared for LLM synthesis
  "failed"
]);
export type IngestionStatus = z.infer<typeof ingestionStatusSchema>;

export const recommendationStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "rejected",
  "promoted"
]);
export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;

export const decisionStatusSchema = z.enum(["open", "decided", "superseded"]);
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;

export const evidenceRecordSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  sourceType: z.string(),
  department: z.string().optional(),
  connectorInstanceId: z.string().optional(),
  sourcePath: z.string(),
  sourceUri: z.string().optional(),
  sourceTimestamp: z.string(),
  ingestedAt: z.string(),
  hash: z.string(),
  sensitivity: sensitivitySchema,
  extractionConfidence: z.number().min(0).max(1),
  ingestionStatus: ingestionStatusSchema,
  freshnessHours: z.number().int().nonnegative(),
  text: z.string()
});
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const dashboardCardSchema = z.object({
  id: z.string(),
  role: z.string(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  agentRoom: z.string().optional(),
  agentRoomLabel: z.string().optional(),
  mandate: z.string().optional(),
  outputType: z.enum(["brief", "risk", "decision", "recommendation", "status"]).optional(),
  approvalPolicy: z.enum(["read_only", "draft_only", "approval_required"]).optional(),
  skillHints: z.array(z.string()).optional(),
  suggestedNextAction: z.string().optional(),
  lastRunAt: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  freshnessHours: z.number().int().nonnegative(),
  evidenceRefs: z.array(z.string())
});
export type DashboardCard = z.infer<typeof dashboardCardSchema>;

export const agentBriefSchema = dashboardCardSchema.extend({
  agentId: z.string(),
  agentName: z.string(),
  agentRoom: z.string(),
  agentRoomLabel: z.string(),
  mandate: z.string(),
  outputType: z.enum(["brief", "risk", "decision", "recommendation", "status"]),
  approvalPolicy: z.enum(["read_only", "draft_only", "approval_required"]),
  skillHints: z.array(z.string()),
  suggestedNextAction: z.string(),
  lastRunAt: z.string()
});
export type AgentBrief = z.infer<typeof agentBriefSchema>;

// ---------------------------------------------------------------------------
// Agent Control Profile (passport) contracts
// ---------------------------------------------------------------------------

export const agentControlStatusSchema = z.enum(["draft", "active", "suspended"]);
export type AgentControlStatus = z.infer<typeof agentControlStatusSchema>;

export const actionRightSchema = z.enum([
  "retrieve",
  "summarize",
  "draft",
  "recommend",
  "prepare_for_approval"
]);
export type ActionRight = z.infer<typeof actionRightSchema>;

export const approvalLevelSchema = z.enum(["owner", "partner", "client", "board"]);
export type ApprovalLevel = z.infer<typeof approvalLevelSchema>;

export const riskRatingSchema = z.enum(["low", "medium", "high", "regulated"]);
export type RiskRating = z.infer<typeof riskRatingSchema>;

export const reviewCadenceSchema = z.enum(["per_output", "weekly", "monthly", "event"]);
export type ReviewCadence = z.infer<typeof reviewCadenceSchema>;

export const agentLogLevelSchema = z.enum(["actions", "actions_sources", "full"]);
export type AgentLogLevel = z.infer<typeof agentLogLevelSchema>;

export const policyControlledApiSchema = z.record(z.unknown());
export type PolicyControlledApi = z.infer<typeof policyControlledApiSchema>;

export const agentControlProfileSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  agentKey: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  purpose: z.string().min(1).max(2000),
  version: z.number().int().positive(),
  status: agentControlStatusSchema,
  allowedScopes: z.array(z.string()).default([]),
  forbiddenScopes: z.array(z.string()).default([]),
  maxSensitivity: sensitivitySchema,
  crossEntityAccess: z.boolean().default(false),
  allowedTools: z.array(z.string()).default([]),
  forbiddenTools: z.array(z.string()).default([]),
  policyControlledApis: policyControlledApiSchema.default({}),
  actionRight: actionRightSchema,
  hardStops: z.array(z.string()).default([]),
  escalationTriggers: z.array(z.string()).default([]),
  approvalLevel: approvalLevelSchema,
  riskRating: riskRatingSchema,
  reviewCadence: reviewCadenceSchema,
  watcherAgents: z.array(z.string()).default([]),
  logLevel: agentLogLevelSchema,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string().optional().nullable(),
  updatedAt: z.string()
});
export type AgentControlProfile = z.infer<typeof agentControlProfileSchema>;

export const agentControlProfileInputSchema = agentControlProfileSchema
  .omit({
    id: true,
    version: true,
    createdAt: true,
    updatedAt: true
  })
  .partial({
    status: true,
    forbiddenScopes: true,
    crossEntityAccess: true,
    allowedTools: true,
    forbiddenTools: true,
    policyControlledApis: true,
    hardStops: true,
    escalationTriggers: true,
    watcherAgents: true,
    updatedBy: true
  });
export type AgentControlProfileInput = z.infer<typeof agentControlProfileInputSchema>;

export const recommendationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  owner: z.string(),
  status: recommendationStatusSchema,
  confidence: z.number().min(0).max(1),
  affectedEntityIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const decisionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  owner: z.string(),
  rationale: z.string(),
  status: decisionStatusSchema,
  evidenceRefs: z.array(z.string()),
  decidedAt: z.string().optional()
});
export type Decision = z.infer<typeof decisionSchema>;

export const askRequestSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  query: z.string().min(3),
  department: z.string().optional()
});

export const askResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  freshnessHours: z.number().int().nonnegative(),
  refused: z.boolean(),
  refusalReason: z.string().optional(),
  evidenceRefs: z.array(z.string())
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema,
    error: z.string().optional()
  });

export type AskResponse = z.infer<typeof askResponseSchema>;

// ---------------------------------------------------------------------------
// Agent OAuth / API Key contracts
// ---------------------------------------------------------------------------

export const agentScopeSchema = z.enum([
  "read:dashboard",
  "read:evidence",
  "read:recommendations",
  "write:ingest",
  "write:approvals",
  "admin"
]);
export type AgentScope = z.infer<typeof agentScopeSchema>;

export const agentKeySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  prefix: z.string(),       // first 8 chars shown in UI
  scopes: z.array(agentScopeSchema),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  active: z.boolean()
});
export type AgentKey = z.infer<typeof agentKeySchema>;

// Returned once on creation, never again (hash stored, not plaintext)
export const agentKeyCreatedSchema = agentKeySchema.extend({
  secret: z.string()
});
export type AgentKeyCreated = z.infer<typeof agentKeyCreatedSchema>;

// ---------------------------------------------------------------------------
// Workspace profile (company context) contract
// ---------------------------------------------------------------------------

export const workspaceProfileSchema = z.object({
  workspaceId: z.string(),
  companyName: z.string().max(200).optional().nullable(),
  sector: z.string().max(64).optional().nullable(),
  subsector: z.string().max(64).optional().nullable(),
  businessModel: z.string().max(120).optional().nullable(),
  companyStage: z.enum(["pre_revenue", "early_stage", "growth", "scale_up", "enterprise", "public"]).optional().nullable(),
  employeeBand: z.enum(["1_10", "11_50", "51_200", "201_1000", "1001_5000", "5000_plus"]).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  primaryGoals: z.array(z.string()).default([]),
  riskProfile: z.enum(["conservative", "moderate", "growth_oriented", "aggressive"]).optional().nullable(),
  priorityRoles: z.array(z.string()).default([]),
  companyArchetype: companyArchetypeSchema.optional().nullable(),
  archetypeVersion: z.string().optional().nullable(),
  briefLanguageMode: briefLanguageModeSchema.default("formal"),
  locationCount: z.number().int().positive().default(1),
  roleStates: z.record(workspaceRoleStateSchema).default({}),
  updatedAt: z.string()
});
export type WorkspaceProfile = z.infer<typeof workspaceProfileSchema>;

export const workspaceProfileUpsertSchema = workspaceProfileSchema.omit({
  workspaceId: true,
  updatedAt: true
});
export type WorkspaceProfileUpsert = z.infer<typeof workspaceProfileUpsertSchema>;

// ---------------------------------------------------------------------------
// Workspace settings contract
// ---------------------------------------------------------------------------

export const workspaceSettingsSchema = z.object({
  workspaceId: z.string(),
  name: z.string(),
  timezone: z.string().default("UTC"),
  llmProvider: z.enum(["anthropic", "openai", "azure_openai"]).default("anthropic"),
  llmModel: z.string().default("claude-opus-4-6"),
  quarantineThreshold: z.number().min(0).max(1).default(0.55),
  defaultSensitivity: sensitivitySchema.default("internal"),
  slackEnabled: z.boolean().default(false),
  teamsEnabled: z.boolean().default(false),
  demoMode: z.boolean().default(false),
  updatedAt: z.string()
});
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;
