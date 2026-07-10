import { PageShell } from "@/components/page-shell";
import { RecommendationList } from "@/components/recommendation-list";
import { repository } from "@/lib/data/repository";
import { safeAuth } from "@/lib/safe-auth";

export default async function RecommendationsPage() {
  const { orgId, userId } = await safeAuth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const recs = await repository.getRecommendations(workspaceId);

  return (
    <PageShell
      title="Recommendations"
      description="AI-generated recommendations from your evidence, ready for review and action."
    >
      <RecommendationList initial={recs} userId={userId ?? "operator"} />
    </PageShell>
  );
}
