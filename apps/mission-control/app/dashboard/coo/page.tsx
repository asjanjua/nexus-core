import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";

export default function COODashboardPage() {
  return (
    <PageShell title="COO Execution View" description="Operational throughput, blockers, and owner-level actions.">
      <DashboardPanel role="coo" />
    </PageShell>
  );
}

