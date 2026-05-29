import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CBODashboardPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="CBO/Strategy Growth View" description="Opportunity map, partnerships, and growth recommendations.">
      <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPanel role="cbo" workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
