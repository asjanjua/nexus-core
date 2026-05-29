import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";

export default async function CTODashboardPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  return (
    <PageShell
      title="CTO / CDO Intelligence View"
      description="Technology health, data governance, AI pipeline status, and security posture."
    >
      <DashboardPanel role="cto" workspaceId={workspaceId} />
    </PageShell>
  );
}
