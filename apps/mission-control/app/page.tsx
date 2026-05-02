import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function HomePage() {
  return (
    <PageShell
      title="NexusAI Executive Intelligence Pilot"
      description="Mission Control routes evidence into role-aware dashboards, recommendations, and decisions."
    >
      <section className="panel space-y-3">
        <p className="text-sm text-white/80">
          Start with CEO dashboard, then test ingestion and Ask. Slack surface is mention-based and policy-gated.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/ceo" className="btn-primary">
            Open CEO Dashboard
          </Link>
          <Link href="/ingestion" className="btn-subtle">
            Open Ingestion
          </Link>
          <Link href="/ask" className="btn-subtle">
            Open Ask
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

