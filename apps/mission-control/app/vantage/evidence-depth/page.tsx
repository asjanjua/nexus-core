import { PageShell } from "@/components/page-shell";
import { VantageEvidenceDepth } from "@/components/vantage-evidence-depth";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Evidence Depth | Vantage" };

/**
 * Vantage Coverage arc, screen 3. Primary user: diligence manager.
 *
 * Was a "planned deep route" chip on the Deal Room hub. It is buildable today
 * because the depth signal is already in the citations the diligence runner
 * returns — coverage just never asked how well-supported each covered item is.
 */
export default async function VantageEvidenceDepthPage() {
  await requireWorkspaceId("/vantage/evidence-depth");

  return (
    <PageShell
      title="Evidence Depth"
      description="Coverage says whether a requirement is cited. Depth says how well. Items resting on a single or low-confidence source are surfaced before the IC date, not after."
    >
      <VantageEvidenceDepth />
    </PageShell>
  );
}
