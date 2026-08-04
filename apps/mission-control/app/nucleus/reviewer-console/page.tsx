import { PageShell } from "@/components/page-shell";
import { NucleusReviewerConsole } from "@/components/nucleus-reviewer-console";
import { requireWorkspaceId } from "@/lib/safe-auth";

/**
 * Nucleus Delivery arc. Primary user: engagement partner.
 *
 * Was four hardcoded items. Now the same PilotHandoffWorkbench driven by
 * document integrity and the accepted reviewer seat.
 */
export default async function NucleusReviewerConsolePage() {
  await requireWorkspaceId("/nucleus/reviewer-console");
  return (
    <PageShell
      title="Reviewer Console & Client Preview"
      description="Route a branded deliverable through partner review, preserve source coverage and caveats, then preview what a client may see."
    >
      <NucleusReviewerConsole />
    </PageShell>
  );
}
