import { z } from "zod";

export const roleSchema = z.enum(["ceo", "coo", "cbo", "cto"]);
export type Role = z.infer<typeof roleSchema>;

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
  role: roleSchema,
  title: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  freshnessHours: z.number().int().nonnegative(),
  evidenceRefs: z.array(z.string())
});
export type DashboardCard = z.infer<typeof dashboardCardSchema>;

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
  query: z.string().min(3)
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
  updatedAt: z.string()
});
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;
