import { PageShell } from "@/components/page-shell";
import { VantageCoverageReview } from "@/components/vantage-coverage-review";
import { requireWorkspaceId } from "@/lib/safe-auth";

/** Vantage Coverage arc, screen 1. Primary user: diligence manager. */
export default async function VantageCoveragePage() {
  await requireWorkspaceId("/vantage/coverage");

  return (
    <PageShell
      title="Diligence Coverage Review"
      description="Run the approved Vantage checklist against governed workspace evidence. Coverage and red flags identify evidence gaps for the deal team; they do not determine whether to invest."
    >
      <VantageCoverageReview />
    </PageShell>
  );
}
