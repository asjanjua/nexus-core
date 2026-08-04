import { PageShell } from "@/components/page-shell";
import { MeridianFilingPackWorkbench } from "@/components/meridian-filing-pack-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Meridian Evidence arc, screen 3. Primary user: engagement lead.
 *
 * Was four hardcoded items. Now the same PilotHandoffWorkbench with pack
 * completeness computed from GET /api/meridian/coverage.
 */
export default async function MeridianFilingPackPage() {
  await requireWorkspaceId("/meridian/filing-pack");
  return (
    <PageShell
      title="Filing Pack Review"
      description="Prepare a reviewer-ready pack from requirement mapping, evidence, caveats, and human attestations. Export and filing stay under named human control."
    >
      <MeridianFilingPackWorkbench />
    </PageShell>
  );
}
