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

export const evidenceSourceTypeSchema = z.enum([
  "upload",
  "document",
  "slack",
  "audit",
  "pdf",
  "docx",
  "pptx",
  "xlsx",
  "csv",
  "txt",
  "md",
  "contract",
  "finance_export",
  "ad_performance",
  "local_ad_performance",
  "social_export",
  "whatsapp_business",
  "local_business",
  "creator_performance",
  "email_crm",
  "google_drive",
  "sharepoint",
  "teams",
  "jira",
  "github",
  "crm",
]);
export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;

export const evidenceRecordSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  sourceType: evidenceSourceTypeSchema,
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

export const knowledgeNoteStatusSchema = z.enum(["active", "archived", "deleted"]);
export type KnowledgeNoteStatus = z.infer<typeof knowledgeNoteStatusSchema>;

export const knowledgeSourceKindSchema = z.enum(["manual", "import", "sync", "automation", "mcp"]);
export type KnowledgeSourceKind = z.infer<typeof knowledgeSourceKindSchema>;

export const knowledgeLinkTypeSchema = z.enum([
  "note",
  "evidence",
  "entity",
  "workflow_twin",
  "decision",
  "recommendation"
]);
export type KnowledgeLinkType = z.infer<typeof knowledgeLinkTypeSchema>;

export const knowledgeNoteSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  path: z.string(),
  body: z.string(),
  tags: z.array(z.string()).default([]),
  sensitivity: sensitivitySchema.default("internal"),
  status: knowledgeNoteStatusSchema.default("active"),
  sourceKind: knowledgeSourceKindSchema.default("manual"),
  frontmatter: z.record(z.unknown()).default({}),
  evidenceRefs: z.array(z.string()).default([]),
  entityRefs: z.array(z.string()).default([]),
  workflowRefs: z.array(z.string()).default([]),
  decisionRefs: z.array(z.string()).default([]),
  recommendationRefs: z.array(z.string()).default([]),
  createdBy: z.string(),
  updatedBy: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type KnowledgeNote = z.infer<typeof knowledgeNoteSchema>;

export const knowledgeNoteInputSchema = z.object({
  title: z.string().min(1).max(200),
  path: z.string().min(1).max(500).optional(),
  body: z.string().max(500000).default(""),
  tags: z.array(z.string().min(1).max(80)).default([]),
  sensitivity: sensitivitySchema.default("internal"),
  status: knowledgeNoteStatusSchema.default("active"),
  sourceKind: knowledgeSourceKindSchema.default("manual"),
  frontmatter: z.record(z.unknown()).default({}),
  evidenceRefs: z.array(z.string()).default([]),
  entityRefs: z.array(z.string()).default([]),
  workflowRefs: z.array(z.string()).default([]),
  decisionRefs: z.array(z.string()).default([]),
  recommendationRefs: z.array(z.string()).default([])
});
export type KnowledgeNoteInput = z.infer<typeof knowledgeNoteInputSchema>;

export const knowledgeLinkSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sourceNoteId: z.string(),
  targetType: knowledgeLinkTypeSchema,
  targetId: z.string(),
  label: z.string(),
  createdAt: z.string()
});
export type KnowledgeLink = z.infer<typeof knowledgeLinkSchema>;

export const knowledgeSearchResultSchema = z.object({
  note: knowledgeNoteSchema,
  score: z.number(),
  matchedFields: z.array(z.string()),
  snippet: z.string()
});
export type KnowledgeSearchResult = z.infer<typeof knowledgeSearchResultSchema>;

export const knowledgeGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.string()
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string(),
    label: z.string().optional()
  }))
});
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;

export const knowledgeSyncModeSchema = z.enum(["disabled", "readonly", "bidirectional"]);
export type KnowledgeSyncMode = z.infer<typeof knowledgeSyncModeSchema>;

export const knowledgeSyncEventSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  type: z.string(),
  path: z.string().optional().nullable(),
  noteId: z.string().optional().nullable(),
  status: z.string(),
  message: z.string().optional().nullable(),
  createdAt: z.string()
});
export type KnowledgeSyncEvent = z.infer<typeof knowledgeSyncEventSchema>;

export const entityTypeSchema = z.enum([
  "person",
  "organization",
  "project",
  "risk",
  "kpi",
  "amount",
  "date",
  "system",
  "process",
  "location",
  "product",
  "unknown"
]);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const entitySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  type: entityTypeSchema,
  name: z.string(),
  metadata: z.record(z.unknown()).default({}),
  evidenceRefs: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  createdAt: z.string().optional()
});
export type Entity = z.infer<typeof entitySchema>;

export const entityInputSchema = z.object({
  workspaceId: z.string(),
  evidenceId: z.string(),
  type: entityTypeSchema,
  name: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).default(0.7),
  metadata: z.record(z.unknown()).default({})
});
export type EntityInput = z.infer<typeof entityInputSchema>;

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
  evidenceRefs: z.array(z.string()),
  outputId: z.string().optional(),
  outputVersion: z.number().int().positive().optional(),
  /** Governance outcome for this brief: ok (default), blocked (output gate /
   * red team), held (below confidence threshold), suspended (agent passport). */
  gateStatus: z.enum(["ok", "blocked", "held", "suspended"]).optional()
});
export type DashboardCard = z.infer<typeof dashboardCardSchema>;

export const agentOutputSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  agentId: z.string(),
  agentVersion: z.number().int().positive(),
  roleKey: z.string(),
  /** Scopes the version chain alongside workspaceId+agentId+roleKey — e.g. a
   * board pack identifier, so two departments/packs don't overwrite each
   * other's "active" output. null/undefined behaves as before this field
   * existed (matches only other untagged outputs). */
  department: z.string().nullable().optional(),
  content: z.string(),
  inputSummary: z.string(),
  evidenceRefs: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  outputVersion: z.number().int().positive(),
  isActive: z.boolean(),
  replacedById: z.string().nullable().optional(),
  createdAt: z.string()
});
export type AgentOutput = z.infer<typeof agentOutputSchema>;

export const agentOutputInputSchema = agentOutputSchema.omit({
  id: true,
  outputVersion: true,
  isActive: true,
  replacedById: true,
  createdAt: true
}).extend({
  processingMs: z.number().int().nonnegative().optional()
});
export type AgentOutputInput = z.infer<typeof agentOutputInputSchema>;

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
// Executive Synthesis contracts
// ---------------------------------------------------------------------------

export const executiveSynthesisQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(z.string()),
  sources: z.array(z.object({
    id: z.string(),
    label: z.string(),
    sourceType: z.string(),
    department: z.string().optional(),
    confidence: z.number().min(0).max(1)
  })).default([]),
  entities: z.array(z.object({
    id: z.string(),
    type: entityTypeSchema,
    name: z.string(),
    confidence: z.number().min(0).max(1)
  })).default([])
});
export type ExecutiveSynthesisQuestion = z.infer<typeof executiveSynthesisQuestionSchema>;

export const executiveSynthesisSchema = z.object({
  role: z.string(),
  workspaceId: z.string(),
  generatedAt: z.string(),
  questions: z.array(executiveSynthesisQuestionSchema),
  overallConfidence: z.number().min(0).max(1),
  totalEvidenceRefs: z.array(z.string()),
  agentCardCount: z.number().int().nonnegative()
});
export type ExecutiveSynthesis = z.infer<typeof executiveSynthesisSchema>;

export const synthesisDeliveryChannelSchema = z.enum(["in_app", "email", "slack"]);
export type SynthesisDeliveryChannel = z.infer<typeof synthesisDeliveryChannelSchema>;

export const synthesisScheduleStatusSchema = z.enum(["success", "partial", "failed"]);
export type SynthesisScheduleStatus = z.infer<typeof synthesisScheduleStatusSchema>;

const cronExpressionSchema = z
  .string()
  .min(9)
  .max(64)
  .refine((value) => value.trim().split(/\s+/).length === 5, "Expected a five-field cron expression");

export const synthesisScheduleInputSchema = z.object({
  enabled: z.boolean().default(true),
  cron: cronExpressionSchema.default("0 7 * * 1"),
  timezone: z.string().min(1).max(64).default("UTC"),
  roles: z.array(roleSchema).min(1).default(["ceo"]),
  delivery: z.array(synthesisDeliveryChannelSchema).min(1).default(["in_app"]),
  emailTargets: z.array(z.string().email()).default([]),
  slackChannel: z.string().nullable().optional()
});
export type SynthesisScheduleInput = z.infer<typeof synthesisScheduleInputSchema>;

export const synthesisScheduleSchema = synthesisScheduleInputSchema.extend({
  id: z.string(),
  workspaceId: z.string(),
  lastRunAt: z.string().nullable().optional(),
  lastStatus: synthesisScheduleStatusSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SynthesisSchedule = z.infer<typeof synthesisScheduleSchema>;

// ---------------------------------------------------------------------------
// Billing tier contracts
// ---------------------------------------------------------------------------

export const billingPlanSchema = z.enum(["free", "pro", "business", "enterprise"]);
export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const planDefinitionSchema = z.object({
  planKey: z.string(),
  label: z.string(),
  priceCents: z.number().int().nonnegative(),
  monthlyTokens: z.number().int(),          // 0 = unlimited
  maxRoles: z.number().int(),               // -1 = unlimited
  maxEvidence: z.number().int(),
  maxTeam: z.number().int(),
  maxConnectors: z.number().int(),
  maxApiKeys: z.number().int(),
  askDailyLimit: z.number().int().nullable(),
  scheduledSynthesis: z.boolean(),
  synthesisMaxCadence: z.string().nullable(),
  emailDelivery: z.boolean(),
  slackDelivery: z.boolean(),
  exportsEnabled: z.boolean(),
  decisionExtraction: z.boolean(),
  customPassports: z.boolean(),
  dataResidency: z.boolean(),
  apiAccess: z.boolean(),
  watermark: z.boolean(),
  stripePriceId: z.string().nullable(),
});
export type PlanDefinition = z.infer<typeof planDefinitionSchema>;

export const tokenBudgetStatusSchema = z.object({
  allowed: z.boolean(),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  percentUsed: z.number().int().min(0).max(100),
  plan: billingPlanSchema,
});
export type TokenBudgetStatus = z.infer<typeof tokenBudgetStatusSchema>;

export const billingFeatureSchema = z.enum([
  "scheduled_synthesis",
  "email_delivery",
  "slack_delivery",
  "exports",
  "decision_extraction",
  "custom_passports",
  "data_residency",
  "api_access",
]);
export type BillingFeature = z.infer<typeof billingFeatureSchema>;

export const workspacePlanSummarySchema = z.object({
  plan: billingPlanSchema,
  planLabel: z.string(),
  priceCents: z.number().int().nonnegative(),
  tokenBudget: z.object({
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    percentUsed: z.number().int().min(0).max(100),
    resetAt: z.string(),
  }),
  limits: z.object({
    roles: z.object({ used: z.number().int(), limit: z.number().int() }),
    evidence: z.object({ used: z.number().int(), limit: z.number().int() }),
    team: z.object({ used: z.number().int(), limit: z.number().int() }),
    apiKeys: z.object({ used: z.number().int(), limit: z.number().int() }),
    askDailyLimit: z.number().int().nullable(),
  }),
  features: z.object({
    scheduledSynthesis: z.boolean(),
    emailDelivery: z.boolean(),
    slackDelivery: z.boolean(),
    exports: z.boolean(),
    decisionExtraction: z.boolean(),
    customPassports: z.boolean(),
    dataResidency: z.boolean(),
    apiAccess: z.boolean(),
  }),
});
export type WorkspacePlanSummary = z.infer<typeof workspacePlanSummarySchema>;

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

export const decisionPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type DecisionPriority = z.infer<typeof decisionPrioritySchema>;

export const decisionSchema = z.object({
  id:             z.string(),
  workspaceId:    z.string(),
  title:          z.string(),
  owner:          z.string(),
  rationale:      z.string(),
  status:         decisionStatusSchema,
  sourceOutputId: z.string().optional().nullable(),
  deadline:       z.string().optional().nullable(),
  priority:       decisionPrioritySchema.default("medium"),
  evidenceRefs:   z.array(z.string()).default([]),
  decidedAt:      z.string().optional().nullable(),
  createdAt:      z.string(),
  updatedAt:      z.string()
});
export type Decision = z.infer<typeof decisionSchema>;

export const decisionInputSchema = z.object({
  title:          z.string().min(1).max(500),
  owner:          z.string().min(1).max(120),
  rationale:      z.string().min(1),
  status:         decisionStatusSchema.default("open"),
  sourceOutputId: z.string().optional(),
  deadline:       z.string().optional(),
  priority:       decisionPrioritySchema.default("medium")
});
export type DecisionInput = z.infer<typeof decisionInputSchema>;

export const actionStatusSchema = z.enum(["open", "done", "deferred", "cancelled"]);
export type ActionStatus = z.infer<typeof actionStatusSchema>;

export const actionSchema = z.object({
  id:          z.string(),
  workspaceId: z.string(),
  decisionId:  z.string(),
  actionText:  z.string(),
  owner:       z.string(),
  dueDate:     z.string().optional().nullable(),
  isBlocker:   z.boolean().default(false),
  status:      actionStatusSchema.default("open"),
  completedAt: z.string().optional().nullable(),
  createdAt:   z.string(),
  updatedAt:   z.string()
});
export type Action = z.infer<typeof actionSchema>;

export const actionInputSchema = z.object({
  decisionId: z.string(),
  actionText: z.string().min(1).max(1000),
  owner:      z.string().min(1).max(120),
  dueDate:    z.string().optional(),
  isBlocker:  z.boolean().default(false)
});
export type ActionInput = z.infer<typeof actionInputSchema>;

// ---------------------------------------------------------------------------
// Workflow Twin primitives (Phase 8A/8B/8C substrate)
// ---------------------------------------------------------------------------

export const workflowTwinTypeSchema = z.enum(["decision_action", "workflow_scorer", "ops_review"]);
export type WorkflowTwinType = z.infer<typeof workflowTwinTypeSchema>;

export const workflowTwinStatusSchema = z.enum(["draft", "active", "paused", "archived"]);
export type WorkflowTwinStatus = z.infer<typeof workflowTwinStatusSchema>;

export const workflowTwinRunStatusSchema = z.enum(["generated", "in_review", "approved", "rejected", "failed"]);
export type WorkflowTwinRunStatus = z.infer<typeof workflowTwinRunStatusSchema>;

export const workflowTwinSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  type: workflowTwinTypeSchema,
  name: z.string(),
  status: workflowTwinStatusSchema,
  config: z.record(z.unknown()).default({}),
  owner: z.string().optional().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string().optional().nullable(),
  updatedAt: z.string()
});
export type WorkflowTwin = z.infer<typeof workflowTwinSchema>;

export const workflowTwinInputSchema = z.object({
  type: workflowTwinTypeSchema,
  name: z.string().min(1).max(200),
  status: workflowTwinStatusSchema.default("draft"),
  config: z.record(z.unknown()).default({}),
  owner: z.string().max(120).optional().nullable()
});
export type WorkflowTwinInput = z.infer<typeof workflowTwinInputSchema>;

export const workflowTwinRunSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  twinId: z.string(),
  twinType: workflowTwinTypeSchema,
  evidenceRefs: z.array(z.string()).default([]),
  generatedOutputRefs: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  status: workflowTwinRunStatusSchema,
  summary: z.string(),
  payload: z.record(z.unknown()).default({}),
  runAt: z.string(),
  reviewedBy: z.string().optional().nullable(),
  reviewedAt: z.string().optional().nullable()
});
export type WorkflowTwinRun = z.infer<typeof workflowTwinRunSchema>;

export const workflowTwinRunInputSchema = z.object({
  evidenceRefs: z.array(z.string()).default([]),
  generatedOutputRefs: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  status: workflowTwinRunStatusSchema.default("generated"),
  summary: z.string().min(1),
  payload: z.record(z.unknown()).default({})
});
export type WorkflowTwinRunInput = z.infer<typeof workflowTwinRunInputSchema>;

export const askRequestSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  query: z.string().min(3),
  department: z.string().optional(),
  agentKey: z.string().min(1).max(120).optional()
});

export const askResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  freshnessHours: z.number().int().nonnegative(),
  refused: z.boolean(),
  refusalReason: z.string().optional(),
  evidenceRefs: z.array(z.string()),
  noteRefs: z.array(z.string()).default([]),
  agentKey: z.string().optional(),
  escalationRequired: z.boolean().optional(),
  escalationReason: z.string().optional()
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema,
    error: z.string().optional()
  });

export type AskResponse = z.infer<typeof askResponseSchema>;

export const conversationMessageSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  createdAt: z.string()
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

// ---------------------------------------------------------------------------
// Agent OAuth / API Key contracts
// ---------------------------------------------------------------------------

export const agentScopeSchema = z.enum([
  "read:dashboard",
  "read:evidence",
  "read:recommendations",
  "read:settings",
  "read:workflows",
  "read:knowledge",
  "write:ingest",
  "write:approvals",
  "write:settings",
  "write:workflows",
  "write:knowledge",
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
// Learning signal contracts (U4)
// ---------------------------------------------------------------------------

export const learningSignalTypeSchema = z.enum([
  "approve",
  "edit",
  "reject",
  "thumbs_up",
  "thumbs_down"
]);
export type LearningSignalType = z.infer<typeof learningSignalTypeSchema>;

export const learningSignalSchema = z.object({
  id:            z.string(),
  workspaceId:   z.string(),
  agentId:       z.string(),
  outputId:      z.string(),
  signalType:    learningSignalTypeSchema,
  editedContent: z.string().optional().nullable(),
  actor:         z.string(),
  createdAt:     z.string()
});
export type LearningSignal = z.infer<typeof learningSignalSchema>;

export const learningSignalInputSchema = z.object({
  agentId:       z.string(),
  outputId:      z.string(),
  signalType:    learningSignalTypeSchema,
  editedContent: z.string().optional()
});
export type LearningSignalInput = z.infer<typeof learningSignalInputSchema>;

export const learningSignalSummarySchema = z.object({
  agentId:     z.string(),
  totalSignals: z.number().int().nonnegative(),
  approvals:   z.number().int().nonnegative(),
  edits:       z.number().int().nonnegative(),
  rejections:  z.number().int().nonnegative(),
  thumbsUp:    z.number().int().nonnegative(),
  thumbsDown:  z.number().int().nonnegative(),
  approvalRate: z.number().min(0).max(1),
  rejectionRate: z.number().min(0).max(1),
  editRate:    z.number().min(0).max(1)
});
export type LearningSignalSummary = z.infer<typeof learningSignalSummarySchema>;

// ---------------------------------------------------------------------------
// Workspace settings contract
// ---------------------------------------------------------------------------

export const whiteLabelBrandSchema = z.object({
  logoUrl: z.string().url().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected 6-digit hex colour").nullable(),
  fontFamily: z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9\s"',.-]+$/, "font family may only contain names, spaces, commas, quotes, dots, and hyphens")
    .nullable(),
});
export type WhiteLabelBrand = z.infer<typeof whiteLabelBrandSchema>;

export const workspaceSettingsSchema = z.object({
  workspaceId: z.string(),
  name: z.string(),
  timezone: z.string().default("UTC"),
  llmProvider: z.enum(["anthropic", "openai", "azure_openai", "deepseek", "openai_compatible"]).default("anthropic"),
  llmModel: z.string().default("claude-opus-4-6"),
  quarantineThreshold: z.number().min(0).max(1).default(0.55),
  defaultSensitivity: sensitivitySchema.default("internal"),
  slackEnabled: z.boolean().default(false),
  teamsEnabled: z.boolean().default(false),
  allowedProviders: z.array(z.enum(["anthropic", "openai", "azure_openai", "deepseek", "openai_compatible", "local"])).default(["anthropic", "deepseek", "openai_compatible"]),
  localOnlyMode: z.boolean().default(false),
  sensitivityCeiling: sensitivitySchema.default("confidential"),
  approvalRequiredThreshold: z.number().min(0).max(1).default(0.7),
  demoMode: z.boolean().default(false),
  /** Level-3 white-label override (Nucleus deployments). Optional so every
   * existing WorkspaceSettings object literal (tests, in-memory defaults)
   * stays valid without changes; null/undefined = default Pinavia branding. */
  whiteLabelBrand: whiteLabelBrandSchema.nullable().optional(),
  updatedAt: z.string()
});
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export const promptRegistryEntrySchema = z.object({
  key: z.string(),
  version: z.string(),
  owner: z.string(),
  description: z.string(),
  template: z.string(),
  changelog: z.array(z.string()),
  lastUpdated: z.string()
});
export type PromptRegistryEntry = z.infer<typeof promptRegistryEntrySchema>;

export const evalCaseCategorySchema = z.enum([
  "risk_detection",
  "decision_framing",
  "recommendation_quality",
  "sector_classification",
  "source_grounding",
  "restricted_data_refusal"
]);
export type EvalCaseCategory = z.infer<typeof evalCaseCategorySchema>;

export const evalResultSchema = z.object({
  caseId: z.string(),
  category: evalCaseCategorySchema,
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  actualOutput: z.string(),
  matchedKeywords: z.array(z.string()),
  failedKeywords: z.array(z.string()),
  forbiddenMatches: z.array(z.string()),
  confidenceMet: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  notes: z.string()
});
export type EvalResult = z.infer<typeof evalResultSchema>;

export const evalRunSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  avgConfidence: z.number().min(0).max(1),
  avgLatencyMs: z.number().int().nonnegative(),
  results: z.array(evalResultSchema),
  createdAt: z.string()
});
export type EvalRunSummary = z.infer<typeof evalRunSummarySchema>;

// ---------------------------------------------------------------------------
// Orchestration Dispatcher
// ---------------------------------------------------------------------------

export const dispatchJobTypeSchema = z.enum([
  "agent_brief",
  "synthesis",
  "workflow_run",
  "decision_extract",
]);
export type DispatchJobType = z.infer<typeof dispatchJobTypeSchema>;

export const dispatchJobStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
  "cancelled",
]);
export type DispatchJobStatus = z.infer<typeof dispatchJobStatusSchema>;

export const dispatchJobSchema = z.object({
  id:           z.string(),
  workspaceId:  z.string(),
  jobType:      dispatchJobTypeSchema,
  payload:      z.record(z.unknown()),
  status:       dispatchJobStatusSchema,
  priority:     z.number().int().min(1).max(10),
  attempts:     z.number().int().nonnegative(),
  maxAttempts:  z.number().int().positive(),
  runAfter:     z.string(),
  startedAt:    z.string().nullable(),
  completedAt:  z.string().nullable(),
  error:        z.string().nullable(),
  parentJobId:  z.string().nullable(),
  createdAt:    z.string(),
});
export type DispatchJob = z.infer<typeof dispatchJobSchema>;

export const agentBriefPayloadSchema = z.object({
  role:       z.string(),
  agentId:    z.string().optional(),
  department: z.string().optional(),
});

export const synthesisPayloadSchema = z.object({
  role:       z.string(),
  department: z.string().optional(),
  persist:    z.boolean().optional().default(true),
});

export const workflowRunPayloadSchema = z.object({
  workflowTwinId: z.string(),
});

export const decisionExtractPayloadSchema = z.object({
  outputIds: z.array(z.string()).optional(),
});

export const dispatchJobInputSchema = z.object({
  jobType:     dispatchJobTypeSchema,
  payload:     z.record(z.unknown()).default({}),
  priority:    z.number().int().min(1).max(10).optional().default(5),
  maxAttempts: z.number().int().positive().optional().default(3),
  runAfter:    z.string().optional(),
  parentJobId: z.string().optional(),
});
/** Output type — fields with defaults are required (Zod has filled them in). */
export type DispatchJobInput = z.infer<typeof dispatchJobInputSchema>;
/** Input type — fields with defaults are optional (before schema.parse()). */
export type DispatchJobRawInput = z.input<typeof dispatchJobInputSchema>;

export const dispatchFanOutInputSchema = z.object({
  jobType:  dispatchJobTypeSchema,
  fanOut:   z.array(z.string()).min(1),
  payload:  z.record(z.unknown()).default({}),
  priority: z.number().int().min(1).max(10).optional().default(5),
});
export type DispatchFanOutInput = z.infer<typeof dispatchFanOutInputSchema>;

// ---------------------------------------------------------------------------
// Strategy profile (migration 0027)
// ---------------------------------------------------------------------------

export const buyerLaneSchema = z.enum([
  "evaluator",
  "sme_self_serve",
  "business_advisory",
  "regulated_enterprise",
]);
export type BuyerLane = z.infer<typeof buyerLaneSchema>;

export const governancePostureSchema = z.enum([
  "standard",
  "regulated",
  "high_trust",
]);
export type GovernancePosture = z.infer<typeof governancePostureSchema>;

export const laneConfidenceSchema = z.enum(["high", "medium", "low"]);
export type LaneConfidence = z.infer<typeof laneConfidenceSchema>;

export const laneChangedBySchema = z.enum([
  "system_suggestion",
  "user_confirmation",
  "admin_override",
]);
export type LaneChangedBy = z.infer<typeof laneChangedBySchema>;

export const strategyProfileSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  buyerLane: buyerLaneSchema.default("evaluator"),
  role: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  companySize: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  sponsorName: z.string().nullable().optional(),
  sponsorEmail: z.string().email().nullable().optional(),
  reviewerName: z.string().nullable().optional(),
  reviewerEmail: z.string().email().nullable().optional(),
  governancePosture: governancePostureSchema.default("standard"),
  selectedWorkflow: z.string().nullable().optional(),
  readinessScores: z.record(z.number().min(1).max(7)).default({}),
  readinessBand: z.string().nullable().optional(),
  externalRef: z.string().nullable().optional(),
  // Lane lifecycle (migration 0033). buyerLane is the CURRENT lane.
  // Changes are rare, explainable, and human-confirmed (docs/LANE_ASSIGNMENT_SPEC.md).
  initialLane: buyerLaneSchema.nullable().optional(),
  laneChangeReason: z.string().max(255).nullable().optional(),
  laneConfidence: laneConfidenceSchema.nullable().optional(),
  laneChangedBy: laneChangedBySchema.nullable().optional(),
  laneChangedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StrategyProfile = z.infer<typeof strategyProfileSchema>;

export const strategyProfileInputSchema = strategyProfileSchema.pick({
  buyerLane: true,
  role: true,
  sector: true,
  companySize: true,
  priority: true,
  sponsorName: true,
  sponsorEmail: true,
  reviewerName: true,
  reviewerEmail: true,
  governancePosture: true,
  selectedWorkflow: true,
  readinessScores: true,
  readinessBand: true,
  externalRef: true,
  initialLane: true,
  laneChangeReason: true,
  laneConfidence: true,
  laneChangedBy: true,
  laneChangedAt: true,
}).partial().extend({
  // API-only guardrail flag. It is required by PATCH when the current lane is
  // regulated_enterprise and the requested lane exits that boundary.
  regulatedExitConfirmed: z.boolean().optional(),
});
export type StrategyProfileInput = z.infer<typeof strategyProfileInputSchema>;

// ---------------------------------------------------------------------------
// Readiness submissions (migration 0033)
// ---------------------------------------------------------------------------

export const readinessSubmissionSchema = z.object({
  id: z.string(),
  scores: z.record(z.number().int().min(1).max(7)),
  total: z.number().int().min(7).max(49),
  band: z.string().min(1).max(32),
  sector: z.string().max(64).nullable().optional(),
  companySize: z.string().max(32).nullable().optional(),
  role: z.string().max(64).nullable().optional(),
  assignedLane: buyerLaneSchema,
  laneConfidence: laneConfidenceSchema,
  email: z.string().email().max(320).nullable().optional(),
  consumedAt: z.string().nullable().optional(),
  consumedByWorkspaceId: z.string().nullable().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type ReadinessSubmission = z.infer<typeof readinessSubmissionSchema>;
