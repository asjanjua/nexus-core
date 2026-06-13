/**
 * POST /api/dispatch  — Enqueue one or more dispatch jobs
 * GET  /api/dispatch  — List recent dispatch jobs for the workspace
 *
 * Scope: read:workspace
 */
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { enqueueJob, enqueueFanOut } from "@/lib/services/dispatcher";
import { dispatchJobInputSchema, dispatchFanOutInputSchema, dispatchJobStatusSchema } from "@/lib/contracts";

// POST body: single job or fan-out
const postBodySchema = z.union([
  dispatchFanOutInputSchema.extend({ fanOut: z.array(z.string()).min(1) }),
  dispatchJobInputSchema,
]);

// GET query params
const listQuerySchema = z.object({
  status:  dispatchJobStatusSchema.optional(),
  jobType: z.string().optional(),
  limit:   z.coerce.number().int().positive().max(100).optional().default(20),
  offset:  z.coerce.number().int().nonnegative().optional().default(0),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_input", 400);

  const data = parsed.data;

  // Fan-out path
  if ("fanOut" in data && Array.isArray(data.fanOut)) {
    const jobs = await enqueueFanOut(
      ctx.workspaceId,
      data.jobType,
      data.fanOut,
      (data.payload ?? {}) as Record<string, unknown>,
      { priority: data.priority ?? 5 }
    );
    return ok({ jobs: jobs.map(j => ({ jobId: j.id, jobType: j.jobType })) }, 202);
  }

  // Single job path
  const singleJob = data as z.infer<typeof dispatchJobInputSchema>;
  const job = await enqueueJob(ctx.workspaceId, {
    jobType:     singleJob.jobType,
    payload:     (singleJob.payload ?? {}) as Record<string, unknown>,
    priority:    singleJob.priority ?? 5,
    maxAttempts: singleJob.maxAttempts ?? 3,
    runAfter:    singleJob.runAfter,
    parentJobId: singleJob.parentJobId,
  });

  return ok({ jobId: job.id, jobType: job.jobType, status: job.status }, 202);
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const parsed = listQuerySchema.safeParse(query);
  if (!parsed.success) return fail("invalid_query", 400);

  const { status, jobType, limit, offset } = parsed.data;

  const jobs = await repository.listDispatchJobs(ctx.workspaceId, {
    status,
    jobType,
    limit,
    offset,
  });

  return ok({ jobs, total: jobs.length, limit, offset });
}
