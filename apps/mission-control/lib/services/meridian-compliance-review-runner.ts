/**
 * Meridian Compliance Review — runtime runner
 *
 * Loads the submission workspace's evidence pool (optionally passport-gated and
 * department-scoped), runs the compliance engine for the chosen license type
 * and status, and writes the started/completed audit events.
 */

import type { AgentControlProfile, EvidenceRecord } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import {
  meridianComplianceAuditEvents,
  reviewMeridianCompliance,
  type MeridianComplianceOptions,
  type MeridianComplianceResult,
} from "@/lib/agents/meridian-compliance-review";
import type { LicenseStatus } from "@/lib/domain/regulatory-requirement-library";

export type RunMeridianComplianceInput = {
  workspaceId: string;
  reviewId: string;
  licenseTypeKey: string;
  status: LicenseStatus;
  agentKey?: string;
  department?: string;
  options?: MeridianComplianceOptions;
};

export type RunMeridianComplianceOutput = MeridianComplianceResult & {
  deniedByPassport: number;
};

export async function runMeridianComplianceReview(
  input: RunMeridianComplianceInput
): Promise<RunMeridianComplianceOutput> {
  const all: EvidenceRecord[] = await repository.getEvidenceForWorkspace(input.workspaceId);
  let pool = input.department
    ? all.filter((record) => record.department === input.department)
    : all;

  let deniedByPassport = 0;
  if (input.agentKey) {
    const passport: AgentControlProfile | null =
      await repository.getActiveAgentControlProfile(input.workspaceId, input.agentKey);
    if (!passport) {
      deniedByPassport = pool.length;
      pool = [];
    } else {
      const governed = filterEvidenceByPassport(pool, passport);
      pool = governed.allowed;
      deniedByPassport = governed.denied.length;
    }
  }

  const result = reviewMeridianCompliance({
    reviewId: input.reviewId,
    licenseTypeKey: input.licenseTypeKey,
    status: input.status,
    records: pool,
    options: input.options,
  });

  const actor = input.agentKey ?? "meridian_compliance_review";
  for (const event of meridianComplianceAuditEvents(
    { reviewId: input.reviewId, licenseTypeKey: input.licenseTypeKey, status: input.status, records: pool },
    result
  )) {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: event.type,
      actor,
      payload: { ...event.payload, deniedByPassport },
    });
  }

  return { ...result, deniedByPassport };
}
