# NexusAI Orchestration Dispatcher — Specification

Status: Building (v0.22.0)
Scoped: 2026-06-10

---

## 1. Problem

The current architecture is entirely request-scoped. Every LLM call happens inline within an HTTP request:
- Dashboard cards: generated on page load
- Synthesis: generated when the user opens the synthesis panel
- Scheduled synthesis: a cron job directly calls `synthesiseForRole()` and blocks until done

This works for single-role, single-request flows. It breaks down as soon as we need:
- Fan-out across multiple agents or roles in the background
- Chained agent steps (agent A feeds agent B)
- Retry on transient LLM failure without losing work
- Priority queuing (urgent decision extraction > routine synthesis)
- Audit trail of every agent invocation, not just outputs
- Rate-limit-safe LLM call scheduling

The orchestration dispatcher is the layer between "a request to do agent work" and "the actual LLM call." It decouples job submission from job execution.

---

## 2. Architecture

```
Client / Cron / API
        |
        ▼
  enqueueJob()          ← creates row in dispatch_jobs (status=pending)
        |
        ▼
  dispatch_jobs table   ← durable queue; survives restarts
        |
        ▼
  /api/cron/dispatch    ← ticked every 1-5 minutes
        |
        ▼
  claimNextJob()        ← atomic UPDATE...RETURNING (prevents double-claim)
        |
        ▼
  executeJob()          ← routes to the right handler by job_type
        |
   ┌────┴────┐
   ▼         ▼
agent_brief  synthesis  workflow_run  decision_extract  (more job types later)
   |
   ▼
markJobDone / markJobFailed (with retry)
        |
   (if parent_job_id) enqueue child jobs
```

The cron runner is stateless. Multiple cron ticks can overlap safely because `claimNextJob()` uses a single atomic SQL statement that marks the job as `running` and returns it only once.

---

## 3. Job Types

| job_type | Payload | Handler | What it does |
|---|---|---|---|
| `agent_brief` | `{ workspaceId, role, agentId?, department? }` | `cardsForRole()` | Generates one or more agent brief cards, saves to agent_outputs |
| `synthesis` | `{ workspaceId, role, department?, persist }` | `synthesiseForRole()` | Runs executive synthesis, optionally persists |
| `workflow_run` | `{ workspaceId, workflowTwinId }` | workflow runner | Executes a workflow twin run |
| `decision_extract` | `{ workspaceId, outputIds? }` | decision extraction | Extracts decisions from recent agent outputs |

New job types can be added without schema changes — the payload is JSONB.

---

## 4. Schema

### 4.1 `dispatch_jobs` table

```sql
CREATE TABLE dispatch_jobs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type        VARCHAR(64) NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | running | done | failed | cancelled
  priority        INTEGER NOT NULL DEFAULT 5,              -- 1 (highest) to 10 (lowest)
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  run_after       TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- supports deferred/scheduled jobs
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  parent_job_id   TEXT REFERENCES dispatch_jobs(id),       -- for chained jobs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dispatch_jobs_claim_idx
  ON dispatch_jobs (status, priority, run_after)
  WHERE status = 'pending';

CREATE INDEX dispatch_jobs_workspace_idx
  ON dispatch_jobs (workspace_id, created_at DESC);
```

### 4.2 Atomic claim query

```sql
UPDATE dispatch_jobs
SET status = 'running', started_at = NOW(), attempts = attempts + 1
WHERE id = (
  SELECT id FROM dispatch_jobs
  WHERE status = 'pending'
    AND run_after <= NOW()
  ORDER BY priority ASC, run_after ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

`FOR UPDATE SKIP LOCKED` ensures that if two cron runners overlap, each claims a different job. No locking conflicts, no double-execution.

---

## 5. Priority

| Priority | Value | Use case |
|---|---|---|
| Critical | 1 | User-triggered on-demand synthesis, decision extraction from fresh upload |
| High | 2 | Scheduled synthesis for active workspaces |
| Normal | 5 (default) | Routine background card refresh |
| Low | 8 | Bulk re-generation, offline batch jobs |
| Background | 10 | Analytics, cleanup, non-urgent enrichment |

---

## 6. Retry Policy

- Default `max_attempts = 3`
- On failure: increment `attempts`, set `status = 'pending'`, set `run_after = NOW() + exponential_backoff`
- Backoff: 30s, 5m, 30m (for attempts 1, 2, 3)
- After `max_attempts` exhausted: `status = 'failed'`, write `error` field
- Failed jobs are never auto-deleted — they stay in the table for inspection

---

## 7. Chaining

When a job completes, it can enqueue child jobs by setting `parent_job_id`. This enables:

```
synthesis job (done)
    └── decision_extract job (enqueued with parent_job_id)
            └── notify job (future)
```

The dispatcher checks for chain continuation in `markJobDone()`.

---

## 8. Dispatch API

### POST /api/dispatch

Enqueue one or more jobs. Returns `{ jobId }` or `{ jobs: [{ jobId, jobType }] }`.

```json
// Single job
{ "jobType": "synthesis", "payload": { "role": "ceo", "persist": true }, "priority": 2 }

// Fan-out: run synthesis for all roles
{ "jobType": "synthesis", "fanOut": ["ceo","coo","cfo"], "payload": { "persist": true }, "priority": 5 }
```

### GET /api/dispatch

List recent dispatch jobs for the workspace.
Query params: `status`, `jobType`, `limit` (default 20), `offset`.

### GET /api/dispatch/[jobId]

Get a single job by ID with full payload and error.

---

## 9. Cron Runner

`POST /api/cron/dispatch`

- Protected by `NEXUS_CRON_SECRET`
- Claims up to `NEXUS_DISPATCH_BATCH_SIZE` jobs per tick (default: 5)
- Executes each job sequentially within the tick (avoids token budget burst)
- Returns `{ processed, succeeded, failed }`

Render cron schedule recommendation: every 2 minutes.

---

## 10. Job Handlers

### agent_brief

```typescript
async function handleAgentBriefJob(job: DispatchJob, workspaceId: string): Promise<void> {
  const { role, agentId, department } = job.payload;
  const cards = await cardsForRole(role, workspaceId, { agentId, department });
  // Cards are persisted to agent_outputs by cardsForRole (existing behaviour)
}
```

### synthesis

```typescript
async function handleSynthesisJob(job: DispatchJob, workspaceId: string): Promise<void> {
  const { role, department, persist } = job.payload;
  await synthesiseForRole({ role, department }, workspaceId, { persist: persist ?? true });
}
```

### workflow_run

```typescript
async function handleWorkflowRunJob(job: DispatchJob, workspaceId: string): Promise<void> {
  const { workflowTwinId } = job.payload;
  // Runs the workflow twin — calls existing workflow runner
}
```

### decision_extract

```typescript
async function handleDecisionExtractJob(job: DispatchJob, workspaceId: string): Promise<void> {
  // Calls existing extractDecisionsFromOutputs()
}
```

---

## 11. What This Enables

After the dispatcher is built, the following become straightforward:

- **Scheduled synthesis** no longer needs to call synthesis directly — it enqueues a job
- **Workflow twins** run as dispatch jobs, enabling background execution and retry
- **Fan-out synthesis** on evidence upload: enqueue synthesis for all active roles
- **Decision extraction** triggered as a child job after synthesis completes
- **Multi-step agent chains**: synthesis → extraction → notification (future)
- **Rate-limit-safe LLM scheduling**: cron processes N jobs per tick, staying within token budget
- **Job audit trail**: every agent invocation is recorded with payload, timing, and result

---

## 12. What This Is Not

- Not a full workflow engine (n8n, Temporal, etc.) — that is a later phase
- Not async from the user's perspective in the UI — the dashboard still renders cards synchronously on request; dispatcher handles background/scheduled work
- Not a message broker — there is no pub/sub, just a DB queue
- Not distributed — single Render instance; `FOR UPDATE SKIP LOCKED` handles concurrency within that constraint

---

## 13. Build Plan (1 session)

1. `docs/DISPATCHER_SPEC.md` — this document
2. `db/migrations/0024_dispatch_jobs.sql`
3. `db/schema.ts` — `dispatchJobs` table
4. `lib/contracts.ts` — `DispatchJob`, `DispatchJobInput`, `DispatchJobType` types
5. `lib/data/repository.ts` — dispatch job CRUD methods
6. `lib/services/dispatcher.ts` — `enqueueJob()`, `claimNextJob()`, `executeJob()`, `runDispatchCycle()`
7. `app/api/dispatch/route.ts` — POST (enqueue), GET (list)
8. `app/api/dispatch/[jobId]/route.ts` — GET single job
9. `app/api/cron/dispatch/route.ts` — cron runner
10. `tests/dispatcher.test.ts` — job lifecycle, retry, chain, priority, handlers
