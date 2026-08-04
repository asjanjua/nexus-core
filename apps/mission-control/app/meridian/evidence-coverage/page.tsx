import { PageShell } from "@/components/page-shell";
import { MeridianCoverageWorkbench } from "@/components/meridian-coverage-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Meridian Evidence arc, screen 2. Primary user: compliance analyst.
 *
 * Was four hardcoded illustrative items. Now the same PilotHandoffWorkbench
 * driven by real coverage from GET /api/meridian/coverage. The workbench is
 * kept deliberately — it is the shared pattern across five vertical screens.
 */
export default async function MeridianEvidenceCoveragePage() {
  await requireWorkspaceId("/meridian/evidence-coverage");
  return (
    <PageShell
      title="Evidence Coverage & Gap Review"
      description="Review requirement evidence before filing preparation. Meridian maps context and routes human follow-up; it does not determine compliance or submit anything."
    >
      <MeridianCoverageWorkbench />
    </PageShell>
  );
}
