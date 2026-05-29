import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function COODashboardPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="COO Execution View" description="Operational throughput, blockers, and owner-level actions.">
      <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPanel role="coo" workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
