import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CBODashboardPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="CBO/Strategy Growth View" description="Opportunity map, partnerships, and growth recommendations.">
      <DashboardPanel role="cbo" workspaceId={workspaceId} />
    </PageShell>
  );
}
