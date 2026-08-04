import { PageShell } from "@/components/page-shell";
import { QuorumMinutesWorkbench } from "@/components/quorum-minutes-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Quorum Record arc. Primary user: company secretary.
 *
 * Was four hardcoded items. Now the same PilotHandoffWorkbench driven by the
 * quorum governance review engine.
 */
export default async function QuorumMinutesDraftPage() {
  await requireWorkspaceId("/board/minutes/draft");
  return (
    <PageShell
      title="Minutes & Action Register"
      description="Prepare a reviewable draft from the agenda, attendance, conflict record, resolutions, and actions. The chair and secretary retain control of the official record."
    >
      <QuorumMinutesWorkbench />
    </PageShell>
  );
}
