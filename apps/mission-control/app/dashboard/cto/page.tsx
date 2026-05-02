import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";

export default function CTODashboardPage() {
  return (
    <PageShell
      title="CTO / CDO Intelligence View"
      description="Technology health, data governance, AI pipeline status, and security posture."
    >
      <DashboardPanel role="cto" />
    </PageShell>
  );
}
