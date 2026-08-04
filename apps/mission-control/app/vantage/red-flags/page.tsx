import { PageShell } from "@/components/page-shell";
import { VantageRedFlagsWorkbench } from "@/components/vantage-red-flags-workbench";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Vantage Coverage arc, screen 2. Primary user: deal advisor.
 *
 * Was four hardcoded illustrative items. Now the same PilotHandoffWorkbench
 * driven by real red flags from the diligence engine.
 */
export default async function VantageRedFlagsPage() {
  await requireWorkspaceId("/vantage/red-flags");
  return (
    <PageShell
      title="Red Flags & IC Handoff"
      description="Separate missing proof from material risk, capture advisor judgment, and frame the investment committee question without making an investment decision."
    >
      <VantageRedFlagsWorkbench />
    </PageShell>
  );
}
