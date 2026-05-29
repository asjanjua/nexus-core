import { PageShell } from "@/components/page-shell";
import { RecommendationList } from "@/components/recommendation-list";
import { repository } from "@/lib/data/repository";
import { auth } from "@clerk/nextjs/server";

export default async function RecommendationsPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const recs = await repository.getRecommendations(workspaceId);

  return (
    <PageShell title="Recommendations" description="Create, review, approve/reject, and track canonical promotion gates.">
      <RecommendationList initial={recs} />
    </PageShell>
  );
}
