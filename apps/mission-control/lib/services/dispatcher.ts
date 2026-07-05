/**
 * Orchestration Dispatcher
 *
 * Decouples job submission from execution. Jobs are persisted to the
 * dispatch_jobs table and claimed atomically by the cron runner.
 *
 * Key properties:
 * - enqueueJob()      → writes pending row to DB
 * - claimNextJob()    → atomic UPDATE...RETURNING with FOR UPDATE SKIP LOCKED
 * - executeJob()      → routes to handler by job_type
 * - runDispatchCycle() → called by /api/cron/dispatch, processes N jobs per tick
 */

import { repository } from "@/lib/data/repository";
import { dispatchJobInputSchema } from "@/lib/contracts";
import type { DispatchJob, DispatchJobInput, DispatchJobRawInput, DispatchJobType } from "@/lib/contracts";
import { cardsForRole } from "@/lib/services/dashboard";
import { synthesiseForRole } from "@/lib/services/synthesis";
import { buildWorkflowTwinRunInput } from "@/lib/services/workflow-twins";
import { proposeDecisionsFromAgentOutputs } from "@/lib/services/decision-extraction";
import { AGENT_LIBRARY } from "@/lib/agents/agent-library";
import { agentSupportsJobType, missingFamiliesForJob, requiredFamiliesForJob } from "@/lib/agents/agent-skills";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Enqueue a single job. Returns the created DispatchJob.
 *  Accepts raw input (optional priority/maxAttempts) — Zod fills in defaults. */
export async function enqueueJob(
  workspaceId: string,
  input: DispatchJobRawInput
): Promise<DispatchJob> {
  const parsed: DispatchJobInput = dispatchJobInputSchema.parse(input);
  return repository.enqueueDispatchJob(workspaceId, parsed);
}

/**
 * Fan-out helper: enqueue one job per item in `fanOutValues`.
 * Each job gets the same jobType, payload, and priority, but the fan-out
 * value is merged into the payload under the `role` key (or a custom key).
 */
export async function enqueueFanOut(
  workspaceId: string,
  jobType: DispatchJobType,
  fanOutValues: string[],
  basePayload: Record<string, unknown> = {},
  opts: { priority?: number; fanOutKey?: string } = {}
): Promise<DispatchJob[]> {
  const { priority = 5, fanOutKey = "role" } = opts;
  const jobs = await Promise.all(
    fanOutValues.map(value =>
      repository.enqueueDispatchJob(workspaceId, {
        jobType,
        payload: { ...basePayload, [fanOutKey]: value },
        priority,
        maxAttempts: 3,
      })
    )
  );
  return jobs;
}

/** Claim the highest-priority pending job that is ready to run. Returns null if queue is empty. */
export async function claimNextJob(): Promise<DispatchJob | null> {
  return repository.claimPendingJob();
}

/**
 * Execute a claimed job by routing to the appropriate handler.
 * Caller must have already claimed the job (status = 'running').
 * On success calls markJobDone. On failure calls markJobFailed (with retry).
 */
export async function executeJob(job: DispatchJob): Promise<{ success: boolean; error?: string }> {
  try {
    await routeJob(job);
    await repository.markJobDone(job.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await repository.markJobFailed(job.id, msg);
    return { success: false, error: msg };
  }
}

/**
 * Run one dispatch cycle — claim and execute up to `batchSize` jobs.
 * Designed to be called by /api/cron/dispatch on a schedule.
 *
 * Jobs are executed sequentially within a tick to avoid LLM token burst.
 */
export async function runDispatchCycle(batchSize = 5): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < batchSize; i++) {
    const job = await claimNextJob();
    if (!job) break; // Queue empty

    processed++;
    const result = await executeJob(job);
    if (result.success) succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed };
}

// ---------------------------------------------------------------------------
// Job routing
// ---------------------------------------------------------------------------

async function routeJob(job: DispatchJob): Promise<void> {
  switch (job.jobType) {
    case "agent_brief":
      return handleAgentBriefJob(job);
    case "synthesis":
      return handleSynthesisJob(job);
    case "workflow_run":
      return handleWorkflowRunJob(job);
    case "decision_extract":
      return handleDecisionExtractJob(job);
    default: {
      // TypeScript exhaustive check — new job types should be added above
      const _exhaustive: never = job.jobType;
      throw new Error(`Unknown job type: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function handleAgentBriefJob(job: DispatchJob): Promise<void> {
  const { role, agentId, department } = job.payload as {
    role: string;
    agentId?: string;
    department?: string;
  };

  if (!role) throw new Error("agent_brief job missing required payload field: role");
  await enforceAgentSkillCompatibility(job, agentId);

  await cardsForRole(role, job.workspaceId, { agentId, department });
}

async function enforceAgentSkillCompatibility(job: DispatchJob, agentId?: string): Promise<void> {
  if (!agentId) return;

  const agent = AGENT_LIBRARY[agentId];
  if (!agent) {
    await repository.pushAudit({
      workspaceId: job.workspaceId,
      type: "dispatch_agent_assignment_denied",
      actor: "dispatcher",
      payload: {
        jobId: job.id,
        jobType: job.jobType,
        agentId,
        reason: "unknown_agent"
      }
    });
    throw new Error(`dispatch_agent_assignment_denied: unknown agent ${agentId}`);
  }

  if (agentSupportsJobType(agent.skillHints, job.jobType)) return;

  const missingFamilies = missingFamiliesForJob(agent.skillHints, job.jobType);
  await repository.pushAudit({
    workspaceId: job.workspaceId,
    type: "dispatch_agent_assignment_denied",
    actor: "dispatcher",
    payload: {
      jobId: job.id,
      jobType: job.jobType,
      agentId,
      agentSkills: agent.skillHints,
      requiredFamilies: requiredFamiliesForJob(job.jobType),
      missingFamilies,
      reason: "agent_missing_required_skill_family"
    }
  });
  throw new Error(`dispatch_agent_assignment_denied: ${agentId} is not compatible with ${job.jobType}`);
}

async function handleSynthesisJob(job: DispatchJob): Promise<void> {
  const { role, department, persist } = job.payload as {
    role: string;
    department?: string;
    persist?: boolean;
  };

  if (!role) throw new Error("synthesis job missing required payload field: role");

  await synthesiseForRole(role, job.workspaceId, { department, persist: persist ?? true });
}

async function handleWorkflowRunJob(job: DispatchJob): Promise<void> {
  const { workflowTwinId } = job.payload as { workflowTwinId: string };
  if (!workflowTwinId) throw new Error("workflow_run job missing required payload field: workflowTwinId");

  const twin = await repository.getWorkflowTwin(job.workspaceId, workflowTwinId);
  if (!twin) throw new Error(`WorkflowTwin not found: ${workflowTwinId}`);

  const runInput = await buildWorkflowTwinRunInput(twin, job.workspaceId);
  await repository.createWorkflowTwinRun(job.workspaceId, twin, runInput, "dispatcher");
}

async function handleDecisionExtractJob(job: DispatchJob): Promise<void> {
  const proposed = await proposeDecisionsFromAgentOutputs({
    workspaceId: job.workspaceId,
    limit: 20,
  });

  await repository.pushAudit({
    workspaceId: job.workspaceId,
    type: "decision_extract_proposals_generated",
    actor: "dispatcher",
    payload: {
      jobId: job.id,
      proposalCount: proposed.length,
      sourceOutputIds: proposed.map((proposal) => proposal.sourceOutputId).filter(Boolean)
    }
  });
}
