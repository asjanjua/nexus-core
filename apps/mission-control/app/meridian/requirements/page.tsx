import { PageShell } from "@/components/page-shell";
import { MeridianCoveragePanel } from "@/components/meridian-coverage-panel";
import { requireWorkspaceId } from "@/lib/safe-auth";

/** Meridian Evidence arc, screen 1. Primary user: regulatory analyst. */
export default async function MeridianRequirementsPage() {
  await requireWorkspaceId("/meridian/requirements");

  return (
    <PageShell
      title="Requirement Library"
      description="The domain-reviewed requirement set for the licence and status in scope, with severity and the evidence tags that would satisfy each item."
    >
      <MeridianCoveragePanel />
    </PageShell>
  );
}
