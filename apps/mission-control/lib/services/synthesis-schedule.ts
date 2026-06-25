import type { Role, SynthesisSchedule, SynthesisScheduleInput, SynthesisScheduleStatus } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { synthesiseForRole } from "@/lib/services/synthesis";
import { sendEmail, buildSynthesisBriefHtml, buildUnsubscribeToken, resendConfigured } from "@/lib/email/resend";

export const DEFAULT_SYNTHESIS_SCHEDULE: SynthesisScheduleInput = {
  enabled: true,
  cron: "0 7 * * 1",
  timezone: "UTC",
  roles: ["ceo"],
  delivery: ["in_app"],
  emailTargets: [],
  slackChannel: null
};

type ScheduleRunResult = {
  workspaceId: string;
  roles: Role[];
  status: SynthesisScheduleStatus;
  generated: number;
  failed: number;
  errors: string[];
};

export type ScheduledSynthesisSummary = {
  checked: number;
  due: number;
  generated: number;
  failed: number;
  results: ScheduleRunResult[];
};

function parseNumberList(field: string, min: number, max: number): Set<number> | null {
  if (field === "*") return null;
  const values = new Set<number>();
  for (const part of field.split(",")) {
    if (/^\*\/\d+$/.test(part)) {
      const step = Number(part.slice(2));
      if (!Number.isFinite(step) || step <= 0) return new Set();
      for (let value = min; value <= max; value += step) values.add(value);
      continue;
    }
    const value = Number(part);
    if (!Number.isInteger(value) || value < min || value > max) return new Set();
    values.add(value);
  }
  return values;
}

function zonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minute: Number(parts.minute),
    hour: Number(parts.hour),
    day: Number(parts.day),
    month: Number(parts.month),
    dow: dayMap[parts.weekday ?? ""] ?? 0
  };
}

function fieldMatches(value: number, allowed: Set<number> | null): boolean {
  return allowed === null || allowed.has(value);
}

function exactCronMatch(cron: string, timezone: string, date: Date): boolean {
  const [minute, hour, day, month, dow] = cron.trim().split(/\s+/);
  if (!minute || !hour || !day || !month || !dow) return false;
  const allowed = {
    minute: parseNumberList(minute, 0, 59),
    hour: parseNumberList(hour, 0, 23),
    day: parseNumberList(day, 1, 31),
    month: parseNumberList(month, 1, 12),
    dow: parseNumberList(dow, 0, 7)
  };
  if (Object.values(allowed).some((value) => value instanceof Set && value.size === 0)) return false;
  const parts = zonedParts(date, timezone);
  const dowAllowed = allowed.dow;
  const dowMatches = dowAllowed === null || dowAllowed.has(parts.dow) || (parts.dow === 0 && dowAllowed.has(7));
  return (
    fieldMatches(parts.minute, allowed.minute) &&
    fieldMatches(parts.hour, allowed.hour) &&
    fieldMatches(parts.day, allowed.day) &&
    fieldMatches(parts.month, allowed.month) &&
    dowMatches
  );
}

export function isCronDue(cron: string, timezone: string, now = new Date(), windowMinutes = 15): boolean {
  for (let offset = 0; offset < windowMinutes; offset += 1) {
    const candidate = new Date(now.getTime() - offset * 60_000);
    if (exactCronMatch(cron, timezone, candidate)) return true;
  }
  return false;
}

function ranRecently(schedule: SynthesisSchedule, now: Date, windowMinutes = 15): boolean {
  if (!schedule.lastRunAt) return false;
  const lastRun = new Date(schedule.lastRunAt).getTime();
  if (!Number.isFinite(lastRun)) return false;
  return now.getTime() - lastRun < windowMinutes * 60_000;
}

export function defaultScheduleForWorkspace(
  workspaceId: string,
  timezone = "UTC"
): SynthesisSchedule {
  const now = new Date().toISOString();
  return {
    id: `default-${workspaceId}`,
    workspaceId,
    ...DEFAULT_SYNTHESIS_SCHEDULE,
    timezone,
    lastRunAt: null,
    lastStatus: null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Send synthesis brief via email to configured recipients.
 * Catches all errors silently — email failure should not break the synthesis run.
 */
async function sendSynthesisEmails(
  schedule: SynthesisSchedule,
  role: string,
  synthesis: Awaited<ReturnType<typeof synthesiseForRole>>
): Promise<void> {
  if (!schedule.delivery.includes("email" as SynthesisSchedule["delivery"][number])) return;
  if (!schedule.emailTargets || schedule.emailTargets.length === 0) return;
  if (!resendConfigured()) return;

  const workspaceSettings = await repository.getWorkspaceSettings(schedule.workspaceId);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "").replace(/\/$/, "");

  for (const email of schedule.emailTargets) {
    try {
      const token = buildUnsubscribeToken(schedule.workspaceId, email);
      const html = buildSynthesisBriefHtml({
        role,
        workspaceName: workspaceSettings.name,
        generatedAt: synthesis.generatedAt,
        questions: synthesis.questions.slice(0, 5).map((q) => ({
          question: q.question,
          answer: q.answer,
          confidence: q.confidence,
          evidenceCount: q.sources?.length ?? 0,
        })),
        briefUrl: `${baseUrl}/dashboard/${role}`,
        unsubscribeToken: token,
      });

      await sendEmail({
        to: email,
        subject: `${workspaceSettings.name} — ${role} Brief — ${new Date(synthesis.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        html,
      });

      await repository.pushAudit({
        workspaceId: schedule.workspaceId,
        type: "synthesis_email_sent",
        actor: "synthesis_cron",
        payload: { role, email, generatedAt: synthesis.generatedAt },
      });
    } catch (emailError) {
      // Log but don't fail the synthesis run for email errors
      await repository.pushAudit({
        workspaceId: schedule.workspaceId,
        type: "synthesis_email_failed",
        actor: "synthesis_cron",
        payload: {
          role,
          email,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        },
      }).catch(() => {});
    }
  }
}

async function runOneSchedule(
  schedule: SynthesisSchedule,
  actor: string
): Promise<ScheduleRunResult> {
  const result: ScheduleRunResult = {
    workspaceId: schedule.workspaceId,
    roles: schedule.roles,
    status: "success",
    generated: 0,
    failed: 0,
    errors: []
  };

  for (const role of schedule.roles) {
    try {
      const synthesis = await synthesiseForRole(role, schedule.workspaceId, { persist: true });
      result.generated += 1;
      await repository.pushAudit({
        workspaceId: schedule.workspaceId,
        type: "synthesis_delivery_sent",
        actor,
        payload: {
          channel: "in_app",
          role,
          generatedAt: synthesis.generatedAt,
          evidenceRefs: synthesis.totalEvidenceRefs.length,
          confidence: synthesis.overallConfidence
        }
      });

      // Send email if configured on this schedule
      await sendSynthesisEmails(schedule, role, synthesis);
    } catch (error) {
      result.failed += 1;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  result.status = result.failed === 0 ? "success" : result.generated > 0 ? "partial" : "failed";
  await repository.updateSynthesisScheduleLastRun(schedule.workspaceId, result.status);
  await repository.pushAudit({
    workspaceId: schedule.workspaceId,
    type: "synthesis_scheduled_run",
    actor,
    payload: {
      roles: schedule.roles,
      status: result.status,
      generated: result.generated,
      failed: result.failed,
      delivery: schedule.delivery,
      errors: result.errors.slice(0, 5)
    }
  });
  return result;
}

export async function runSynthesisScheduleNow(
  workspaceId: string,
  actor = "synthesis_scheduler"
): Promise<ScheduleRunResult> {
  const settings = await repository.getWorkspaceSettings(workspaceId);
  const schedule =
    (await repository.getSynthesisSchedule(workspaceId)) ??
    defaultScheduleForWorkspace(workspaceId, settings.timezone);
  return runOneSchedule(schedule, actor);
}

export async function runScheduledSynthesis(now = new Date()): Promise<ScheduledSynthesisSummary> {
  const schedules = await repository.listEnabledSynthesisSchedules();
  const due = schedules.filter(
    (schedule) => isCronDue(schedule.cron, schedule.timezone, now) && !ranRecently(schedule, now)
  );
  const summary: ScheduledSynthesisSummary = {
    checked: schedules.length,
    due: due.length,
    generated: 0,
    failed: 0,
    results: []
  };

  for (const schedule of due) {
    const result = await runOneSchedule(schedule, "synthesis_cron");
    summary.generated += result.generated;
    summary.failed += result.failed;
    summary.results.push(result);
  }

  return summary;
}
