import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";

export default function CBODashboardPage() {
  return (
    <PageShell title="CBO/Strategy Growth View" description="Opportunity map, partnerships, and growth recommendations.">
      <DashboardPanel role="cbo" />
    </PageShell>
  );
}

