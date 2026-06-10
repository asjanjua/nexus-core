/**
 * GET  /api/dispatch/[jobId]    — Get single job by ID
 * DELETE /api/dispatch/[jobId]  — Cancel a pending job
 *
 * Scope: read:workspace
 */
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  const { jobId } = await params;
  const job = await repository.getDispatchJob(jobId);

  if (!job) return fail("job_not_found", 404);
  if (job.workspaceId !== ctx.workspaceId) return fail("job_not_found", 404);

  return ok({ job });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { ctx, error } = await requireScope(request, "read:workspace");
  if (error) return error;

  const { jobId } = await params;
  const job = await repository.getDispatchJob(jobId);

  if (!job) return fail("job_not_found", 404);
  if (job.workspaceId !== ctx.workspaceId) return fail("job_not_found", 404);

  if (job.status !== "pending") {
    return fail("job_not_cancellable", 409, { status: job.status });
  }

  await repository.cancelJob(jobId);
  return ok({ cancelled: true, jobId });
}
