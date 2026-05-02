import { PageShell } from "@/components/page-shell";
import { RecommendationList } from "@/components/recommendation-list";
import { store } from "@/lib/data/store";

export default function RecommendationsPage() {
  const recs = store.getRecommendations("workspace-demo");

  return (
    <PageShell title="Recommendations" description="Create, review, approve/reject, and track canonical promotion gates.">
      <RecommendationList initial={recs} />
    </PageShell>
  );
}

