import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function COODashboardPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell title="COO Execution View" description="Operational throughput, blockers, and owner-level actions.">
      <DashboardPanel role="coo" workspaceId={workspaceId} />
    </PageShell>
  );
}
