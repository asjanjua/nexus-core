import { PageShell } from "@/components/page-shell";
import { MeridianSubmissionPanel } from "@/components/meridian-submission-panel";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Meridian — Submission Room.
 *
 * Gated with requireWorkspaceId (not safeAuth) so an unauthenticated visitor
 * is redirected to sign-in rather than silently dropped into the demo
 * workspace. See the auth-gate fix: safeAuth's demo fallback is the wrong
 * pattern for any page that reads real workspace data.
 */
export default async function MeridianPage() {
  await requireWorkspaceId("/meridian");

  return (
    <PageShell
      title="Meridian Submission Room"
      description="Regulatory submissions prepared from your own evidence: jurisdiction scope, requirement coverage, gap triage, and a reviewer-signed filing pack. Meridian prepares and checks; a human files."
    >
      <MeridianSubmissionPanel />
    </PageShell>
  );
}
