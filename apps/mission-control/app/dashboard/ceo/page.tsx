import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CEODashboardPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="CEO Command Brief" description="Strategic priorities, cross-functional risks, and open decisions.">
      <DashboardPanel role="ceo" workspaceId={workspaceId} />
    </PageShell>
  );
}
