import { NucleusEngagementPanel } from "@/components/nucleus-engagement-panel";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function NucleusPage() {
  await requireWorkspaceId("/nucleus");

  return (
    <PageShell
      title="Nucleus Engagement Room"
      description="A white-label methodology platform for advisory firms: branded client rooms, repeatable method packs, governed evidence, reviewer gates, and fixed trust mechanics. Partners advise; Nucleus organizes and proves."
    >
      <NucleusEngagementPanel />
    </PageShell>
  );
}
