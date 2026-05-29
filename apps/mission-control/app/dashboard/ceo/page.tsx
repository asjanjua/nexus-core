import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CEODashboardPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="CEO Command Brief" description="Strategic priorities, cross-functional risks, and open decisions.">
      <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPanel role="ceo" workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
