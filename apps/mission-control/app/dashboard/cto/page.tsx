import { Suspense } from "react";
import { DashboardPanel } from "@/components/dashboard-panel";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CTODashboardPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell
      title="CTO / CDO Intelligence View"
      description="Technology health, data governance, AI pipeline status, and security posture."
    >
      <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPanel role="cto" workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
