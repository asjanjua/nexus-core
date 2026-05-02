import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";

export default function CEODashboardPage() {
  return (
    <PageShell title="CEO Command Brief" description="Strategic priorities, cross-functional risks, and open decisions.">
      <DashboardPanel role="ceo" />
    </PageShell>
  );
}

