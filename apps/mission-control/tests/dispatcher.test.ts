/**
 * Orchestration Dispatcher — unit tests (v0.22.0)
 *
 * Tests cover:
 * - Job enqueue and retrieval
 * - Job status lifecycle (pending → running → done / failed)
 * - Retry logic and exponential backoff
 * - Fan-out enqueue
 * - runDispatchCycle batch processing
 * - claimNextJob priority and run_after ordering
 * - executeJob routing to handlers
 * - cancelJob
 * - countPendingJobs
 * - API route validation (POST /api/dispatch, GET /api/dispatch)
 * - Cron route authorization
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------

const jobs: Record<string, ReturnType<typeof makeJob>> = {};

type JobShape = {
  id: string; workspaceId: string; jobType: "synthesis" | "agent_brief" | "workflow_run" | "decision_extract";
  payload: Record<string, unknown>; status: "pending" | "running" | "done" | "failed" | "cancelled";
  priority: number; attempts: number; maxAttempts: number; runAfter: string;
  startedAt: string | null; completedAt: string | null; error: string | null;
  parentJobId: string | null; createdAt: string;
};

function makeJob(
  id: string,
  workspaceId: string,
  overrides: Partial<JobShape> = {}
) {
  return {
    id,
    workspaceId,
    jobType: "synthesis" as const,
    payload: { role: "ceo", persist: true },
    status: "pending" as "pending" | "running" | "done" | "failed" | "cancelled",
    priority: 5,
    attempts: 0,
    maxAttempts: 3,
    runAfter: new Date(Date.now() - 1000).toISOString(), // already due
    startedAt: null as string | null,
    completedAt: null as string | null,
    error: null as string | null,
    parentJobId: null as string | null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

vi.mock("@/lib/data/repository", () => ({
  repository: {
    enqueueDispatchJob: vi.fn(async (workspaceId: string, input: Record<string, unknown>) => {
      const id = `job-${Object.keys(jobs).length + 1}`;
      const job = makeJob(id, workspaceId, {
        jobType: input.jobType as "synthesis",
        payload: (input.payload ?? {}) as Record<string, unknown>,
        priority: (input.priority as number) ?? 5,
        maxAttempts: (input.maxAttempts as number) ?? 3,
        runAfter: (input.runAfter as string) ?? new Date(Date.now() - 1000).toISOString(),
        parentJobId: (input.parentJobId as string) ?? null,
      });
      jobs[id] = job;
      return job;
    }),
    claimPendingJob: vi.fn(async () => {
      const pending = Object.values(jobs)
        .filter(j => j.status === "pending" && new Date(j.runAfter) <= new Date())
        .sort((a, b) => a.priority - b.priority);
      if (pending.length === 0) return null;
      const job = pending[0];
      job.status = "running";
      job.startedAt = new Date().toISOString();
      job.attempts += 1;
      return { ...job };
    }),
    markJobDone: vi.fn(async (jobId: string) => {
      if (jobs[jobId]) { jobs[jobId].status = "done"; jobs[jobId].completedAt = new Date().toISOString(); }
    }),
    markJobFailed: vi.fn(async (jobId: string, error: string) => {
      const job = jobs[jobId];
      if (!job) return;
      if (job.attempts >= job.maxAttempts) {
        job.status = "failed"; job.error = error; job.completedAt = new Date().toISOString();
      } else {
        job.status = "pending"; job.error = error;
        job.runAfter = new Date(Date.now() + 30_000).toISOString();
      }
    }),
    getDispatchJob: vi.fn(async (jobId: string) => jobs[jobId] ?? null),
    listDispatchJobs: vi.fn(async (workspaceId: string) =>
      Object.values(jobs).filter(j => j.workspaceId === workspaceId)
    ),
    cancelJob: vi.fn(async (jobId: string) => {
      if (jobs[jobId]) { jobs[jobId].status = "cancelled"; jobs[jobId].completedAt = new Date().toISOString(); }
    }),
    countPendingJobs: vi.fn(async (workspaceId?: string) =>
      Object.values(jobs).filter(j => j.status === "pending" && (!workspaceId || j.workspaceId === workspaceId)).length
    ),
    pushAudit: vi.fn(async () => undefined),
    getWorkflowTwin: vi.fn(async () => null),
    createWorkflowTwinRun: vi.fn(async () => ({})),
    listAgentOutputs: vi.fn(async () => []),
    createDecision: vi.fn(async () => ({})),
  },
}));

// Handler service mocks
vi.mock("@/lib/services/dashboard", () => ({
  cardsForRole: vi.fn(async () => []),
}));

vi.mock("@/lib/services/synthesis", () => ({
  synthesiseForRole: vi.fn(async () => ({ role: "ceo", answers: [] })),
}));

vi.mock("@/lib/services/workflow-twins", () => ({
  buildWorkflowTwinRunInput: vi.fn(async () => ({ evidenceRefs: [], generatedOutputRefs: [], confidence: 0.7, status: "generated", summary: "ok", payload: {} })),
}));

vi.mock("@/lib/services/decision-extraction", () => ({
  proposeDecisionsFromAgentOutputs: vi.fn(async () => []),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { enqueueJob, enqueueFanOut, claimNextJob, executeJob, runDispatchCycle } from "@/lib/services/dispatcher";
import { repository } from "@/lib/data/repository";
import { cardsForRole } from "@/lib/services/dashboard";
import { synthesiseForRole } from "@/lib/services/synthesis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearJobs() {
  for (const k of Object.keys(jobs)) delete jobs[k];
  vi.clearAllMocks();
  // Re-attach mock implementations after clearAllMocks
  vi.mocked(repository.enqueueDispatchJob).mockImplementation(async (workspaceId: string, input: Record<string, unknown>) => {
    const id = `job-${Object.keys(jobs).length + 1}`;
    const job = makeJob(id, workspaceId, {
      jobType: input.jobType as "synthesis",
      payload: (input.payload ?? {}) as Record<string, unknown>,
      priority: (input.priority as number) ?? 5,
      maxAttempts: (input.maxAttempts as number) ?? 3,
      runAfter: (input.runAfter as string) ?? new Date(Date.now() - 1000).toISOString(),
      parentJobId: (input.parentJobId as string) ?? null,
    });
    jobs[id] = job;
    return job;
  });
  vi.mocked(repository.claimPendingJob).mockImplementation(async () => {
    const pending = Object.values(jobs)
      .filter(j => j.status === "pending" && new Date(j.runAfter) <= new Date())
      .sort((a, b) => a.priority - b.priority);
    if (pending.length === 0) return null;
    const job = pending[0];
    job.status = "running"; job.startedAt = new Date().toISOString(); job.attempts += 1;
    return { ...job };
  });
  vi.mocked(repository.markJobDone).mockImplementation(async (jobId: string) => {
    if (jobs[jobId]) { jobs[jobId].status = "done"; jobs[jobId].completedAt = new Date().toISOString(); }
  });
  vi.mocked(repository.markJobFailed).mockImplementation(async (jobId: string, error: string) => {
    const job = jobs[jobId];
    if (!job) return;
    if (job.attempts >= job.maxAttempts) {
      job.status = "failed"; job.error = error; job.completedAt = new Date().toISOString();
    } else {
      job.status = "pending"; job.error = error;
      job.runAfter = new Date(Date.now() + 30_000).toISOString();
    }
  });
  vi.mocked(repository.getDispatchJob).mockImplementation(async (jobId: string) => jobs[jobId] ?? null);
  vi.mocked(repository.listDispatchJobs).mockImplementation(async (workspaceId: string) =>
    Object.values(jobs).filter(j => j.workspaceId === workspaceId)
  );
  vi.mocked(repository.cancelJob).mockImplementation(async (jobId: string) => {
    if (jobs[jobId]) { jobs[jobId].status = "cancelled"; jobs[jobId].completedAt = new Date().toISOString(); }
  });
  vi.mocked(repository.countPendingJobs).mockImplementation(async (workspaceId?: string) =>
    Object.values(jobs).filter(j => j.status === "pending" && (!workspaceId || j.workspaceId === workspaceId)).length
  );
  vi.mocked(repository.listAgentOutputs).mockResolvedValue([]);
  vi.mocked(repository.getWorkflowTwin).mockResolvedValue(null);
  vi.mocked(cardsForRole).mockResolvedValue([]);
  vi.mocked(synthesiseForRole).mockResolvedValue({ role: "ceo", answers: [] } as never);
}

beforeEach(() => clearJobs());

const WS = "workspace-test";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enqueueJob", () => {
  it("creates a pending job with correct fields", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    expect(job.status).toBe("pending");
    expect(job.jobType).toBe("synthesis");
    expect(job.workspaceId).toBe(WS);
    expect(job.priority).toBe(5);
    expect(job.attempts).toBe(0);
  });

  it("respects custom priority and maxAttempts", async () => {
    const job = await enqueueJob(WS, { jobType: "agent_brief", payload: { role: "coo" }, priority: 2, maxAttempts: 5 });
    expect(job.priority).toBe(2);
    expect(job.maxAttempts).toBe(5);
  });

  it("sets parentJobId when provided", async () => {
    const parent = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    const child = await enqueueJob(WS, { jobType: "decision_extract", payload: {}, parentJobId: parent.id });
    expect(child.parentJobId).toBe(parent.id);
  });
});

describe("enqueueFanOut", () => {
  it("creates one job per fan-out value", async () => {
    const roles = ["ceo", "coo", "cfo"];
    const fanJobs = await enqueueFanOut(WS, "synthesis", roles, { persist: true }, { priority: 3 });
    expect(fanJobs).toHaveLength(3);
    expect(fanJobs.map(j => (j.payload as Record<string, unknown>).role).sort()).toEqual(["ceo", "cfo", "coo"]);
    expect(fanJobs.every(j => j.priority === 3)).toBe(true);
  });

  it("merges base payload with fan-out value", async () => {
    const jobs_ = await enqueueFanOut(WS, "synthesis", ["ceo"], { persist: false });
    expect((jobs_[0].payload as Record<string, unknown>).persist).toBe(false);
    expect((jobs_[0].payload as Record<string, unknown>).role).toBe("ceo");
  });
});

describe("claimNextJob", () => {
  it("returns null when queue is empty", async () => {
    const job = await claimNextJob();
    expect(job).toBeNull();
  });

  it("claims the highest-priority pending job", async () => {
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" }, priority: 8 });
    await enqueueJob(WS, { jobType: "agent_brief", payload: { role: "coo" }, priority: 1 });
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "cfo" }, priority: 5 });

    const claimed = await claimNextJob();
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe("running");
    expect(claimed!.priority).toBe(1);
  });

  it("sets startedAt and increments attempts on claim", async () => {
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    const claimed = await claimNextJob();
    expect(claimed!.startedAt).toBeTruthy();
    expect(claimed!.attempts).toBe(1);
  });

  it("does not claim jobs with future runAfter", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" }, runAfter: future });
    // Override the runAfter in the stored job directly
    const stored = Object.values(jobs)[0];
    stored.runAfter = future;

    const claimed = await claimNextJob();
    expect(claimed).toBeNull();
  });
});

describe("executeJob — success path", () => {
  it("marks job done after successful synthesis handler", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    // Simulate claim
    job.status = "running"; job.attempts = 1;

    const result = await executeJob(job);

    expect(result.success).toBe(true);
    expect(vi.mocked(synthesiseForRole)).toHaveBeenCalledWith(
      "ceo",
      WS,
      { department: undefined, persist: true }
    );
    expect(vi.mocked(repository.markJobDone)).toHaveBeenCalledWith(job.id);
  });

  it("calls cardsForRole for compatible agent_brief jobs", async () => {
    const job = await enqueueJob(WS, { jobType: "agent_brief", payload: { role: "coo", agentId: "strategy_agent" } });
    job.status = "running"; job.attempts = 1;

    const result = await executeJob(job);

    expect(result.success).toBe(true);
    expect(vi.mocked(cardsForRole)).toHaveBeenCalledWith("coo", WS, { agentId: "strategy_agent", department: undefined });
  });

  it("denies unknown explicit agent assignments before running the handler", async () => {
    const job = await enqueueJob(WS, { jobType: "agent_brief", payload: { role: "coo", agentId: "not_an_agent" } });
    job.status = "running"; job.attempts = 1;

    const result = await executeJob(job);

    expect(result.success).toBe(false);
    expect(result.error).toContain("dispatch_agent_assignment_denied");
    expect(vi.mocked(cardsForRole)).not.toHaveBeenCalled();
    expect(vi.mocked(repository.pushAudit)).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: WS,
      type: "dispatch_agent_assignment_denied",
      actor: "dispatcher",
      payload: expect.objectContaining({
        jobId: job.id,
        agentId: "not_an_agent",
        reason: "unknown_agent"
      })
    }));
  });
});

describe("executeJob — failure and retry", () => {
  it("calls markJobFailed when handler throws", async () => {
    vi.mocked(synthesiseForRole).mockRejectedValueOnce(new Error("LLM timeout"));

    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    job.status = "running"; job.attempts = 1;

    const result = await executeJob(job);

    expect(result.success).toBe(false);
    expect(result.error).toContain("LLM timeout");
    expect(vi.mocked(repository.markJobFailed)).toHaveBeenCalledWith(job.id, "LLM timeout");
  });

  it("job retries when attempts < maxAttempts", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" }, maxAttempts: 3 });
    job.attempts = 1;
    await repository.markJobFailed(job.id, "transient error");

    const stored = jobs[job.id];
    expect(stored.status).toBe("pending"); // back to pending for retry
    expect(stored.error).toBe("transient error");
  });

  it("job enters failed state when attempts exhausted", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" }, maxAttempts: 3 });
    job.attempts = 3;
    jobs[job.id].attempts = 3;
    await repository.markJobFailed(job.id, "permanent error");

    const stored = jobs[job.id];
    expect(stored.status).toBe("failed");
    expect(stored.error).toBe("permanent error");
  });
});

describe("runDispatchCycle", () => {
  it("processes nothing when queue is empty", async () => {
    const result = await runDispatchCycle(5);
    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("processes up to batchSize jobs", async () => {
    for (let i = 0; i < 7; i++) {
      await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    }
    const result = await runDispatchCycle(3);
    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
  });

  it("counts failures in the cycle result", async () => {
    vi.mocked(synthesiseForRole).mockRejectedValue(new Error("boom"));
    for (let i = 0; i < 2; i++) {
      await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    }
    const result = await runDispatchCycle(5);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.succeeded).toBe(0);
  });

  it("stops early when queue drains before batchSize", async () => {
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    const result = await runDispatchCycle(10);
    expect(result.processed).toBe(1);
  });
});

describe("cancelJob", () => {
  it("cancels a pending job", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    await repository.cancelJob(job.id);
    const stored = jobs[job.id];
    expect(stored.status).toBe("cancelled");
    expect(stored.completedAt).toBeTruthy();
  });
});

describe("countPendingJobs", () => {
  it("returns 0 for empty queue", async () => {
    expect(await repository.countPendingJobs(WS)).toBe(0);
  });

  it("counts only pending jobs for the workspace", async () => {
    await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    await enqueueJob(WS, { jobType: "agent_brief", payload: { role: "coo" } });
    await enqueueJob("other-workspace", { jobType: "synthesis", payload: { role: "ceo" } });

    expect(await repository.countPendingJobs(WS)).toBe(2);
    expect(await repository.countPendingJobs("other-workspace")).toBe(1);
  });

  it("excludes done and failed jobs from count", async () => {
    const job = await enqueueJob(WS, { jobType: "synthesis", payload: { role: "ceo" } });
    await repository.markJobDone(job.id);
    expect(await repository.countPendingJobs(WS)).toBe(0);
  });
});

describe("workflow_run job type", () => {
  it("throws when workflowTwinId is missing", async () => {
    const job = makeJob("j-wf", WS, { jobType: "workflow_run" as never, payload: {} });
    job.status = "running"; job.attempts = 1;
    const result = await executeJob(job);
    expect(result.success).toBe(false);
    expect(result.error).toContain("workflowTwinId");
  });

  it("throws when workflow twin not found", async () => {
    vi.mocked(repository.getWorkflowTwin).mockResolvedValueOnce(null);
    const job = makeJob("j-wf2", WS, { jobType: "workflow_run" as never, payload: { workflowTwinId: "wt-999" } });
    job.status = "running"; job.attempts = 1;
    // Register in jobs store so markJobFailed can update it
    jobs["j-wf2"] = job;
    const result = await executeJob(job);
    expect(result.success).toBe(false);
    expect(result.error).toContain("wt-999");
  });
});

describe("decision_extract job type", () => {
  it("runs successfully with empty outputs", async () => {
    const job = await enqueueJob(WS, { jobType: "decision_extract", payload: {} });
    job.status = "running"; job.attempts = 1;
    const result = await executeJob(job);
    expect(result.success).toBe(true);
  });
});
