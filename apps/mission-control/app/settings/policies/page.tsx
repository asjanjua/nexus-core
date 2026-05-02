import { PageShell } from "@/components/page-shell";

export default function PolicySettingsPage() {
  return (
    <PageShell
      title="Policy Settings"
      description="Governance thresholds, approval rules, and outbound surface safety constraints."
    >
      <section className="panel space-y-2 text-sm text-white/80">
        <p>quarantine_threshold: 0.55</p>
        <p>recommendation_approval_required: true</p>
        <p>slack_restricted_payloads_blocked: true</p>
        <p>stale_data_banner_threshold_hours: 168</p>
        <p>canonical_promotion_requires_human_approval: true</p>
      </section>
    </PageShell>
  );
}

