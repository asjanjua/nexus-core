/**
 * POST /api/feedback
 *
 * Accepts pilot client feedback from the in-app feedback button.
 * Writes to the audit log and optionally sends an email if NEXUS_SUPPORT_EMAIL is set.
 *
 * Scope: read:dashboard (any authenticated user can submit feedback)
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

const feedbackSchema = z.object({
  subject: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_input", 400);

  const { subject, message } = parsed.data;

  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "feedback.submitted",
    actor: ctx.userId,
    payload: { subject, message, submittedAt: new Date().toISOString() },
  });

  // Optional: forward to support email via simple SMTP or a transactional email service.
  // Set NEXUS_SUPPORT_EMAIL in env. This is a no-op if not configured.
  const supportEmail = process.env.NEXUS_SUPPORT_EMAIL;
  if (supportEmail) {
    // Log intent — actual email sending requires a configured SMTP/transactional service.
    // Replace this block with nodemailer or Resend when the support email service is wired.
    console.log(`[feedback] workspace=${ctx.workspaceId} to=${supportEmail} subject="${subject}"`);
  }

  return ok({ submitted: true });
}
