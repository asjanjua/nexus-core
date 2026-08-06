import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pilot SLA — Pinavia",
  description:
    "Service Level Agreement for Pinavia pilot workspaces: uptime, support response, data handling, and escalation.",
};

export default function PilotSlaPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Pilot SLA</h1>
          <p className="mt-4 text-lg text-white/50">
            Service level commitments for Pinavia pilot workspaces.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Uptime</h2>
            <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>
                <strong className="text-white/80">Target:</strong> 99.5% uptime during pilot
                phase (measured monthly). Status publicly visible at{" "}
                <a href="/status" className="text-nexus-accent hover:underline">
                  /status
                </a>
                .
              </p>
              <p>
                <strong className="text-white/80">Scheduled maintenance:</strong> Sunday 02:00–04:00
                UTC. Advance notice of at least 24 hours via email for any maintenance exceeding
                1 hour.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Support Response</h2>
            <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>
                <strong className="text-white/80">Standard:</strong> Response within 4 business
                hours (Sunday–Thursday, 09:00–18:00 GST). Contact:{" "}
                <a href="mailto:support@pinavia.io" className="text-nexus-accent hover:underline">
                  support@pinavia.io
                </a>
              </p>
              <p>
                <strong className="text-white/80">Critical:</strong> System-down issues affecting
                all workspace access — response within 1 hour. Escalate to:{" "}
                <a href="mailto:security@nexusai.io" className="text-nexus-accent hover:underline">
                  security@nexusai.io
                </a>
              </p>
              <p>
                <strong className="text-white/80">Scope:</strong> Platform uptime, ingestion
                pipeline, LLM synthesis, and evidence retrieval. Does not cover client-side
                issues (browser, network, third-party auth).
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Data Handling</h2>
            <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>
                <strong className="text-white/80">Encryption:</strong> All data encrypted at rest
                (AES-256-GCM) and in transit (TLS 1.3).
              </p>
              <p>
                <strong className="text-white/80">Backups:</strong> Automated 30-day point-in-time
                recovery via Neon. Export available on request.
              </p>
              <p>
                <strong className="text-white/80">Deletion:</strong> Workspace data permanently
                purged within 30 days of contract termination. See{" "}
                <a href="/compliance" className="text-nexus-accent hover:underline">
                  /compliance
                </a>{" "}
                for full retention policy.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Escalation</h2>
            <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>
                <strong className="text-white/80">Level 1 — support@pinavia.io:</strong>{" "}
                Standard issues (feature questions, minor bugs, UI issues).
              </p>
              <p>
                <strong className="text-white/80">Level 2 — Ali Janjua:</strong>{" "}
                Workspace configuration, billing, access issues, performance degradation.
              </p>
              <p>
                <strong className="text-white/80">Level 3 — security@nexusai.io:</strong>{" "}
                System-down, data breach, security incidents, evidence corruption.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-medium text-white">Exclusions</h2>
            <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>The following are not covered under pilot SLA:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Feature requests or roadmap acceleration</li>
                <li>Custom LLM model training or fine-tuning</li>
                <li>Third-party connector reliability (e.g., WhatsApp, bank portals before Phase 10B)</li>
                <li>Client-side infrastructure (browser, network, local file system)</li>
                <li>LLM provider outages beyond the dual-path routing fallback (Anthropic or DeepSeek)</li>
              </ul>
            </div>
          </section>
        </div>

        <p className="mt-12 text-center text-xs text-white/20">
          Pinavia FZCO · Dubai, UAE · Effective 2026-08-06 · Valid for all pilot workspaces
        </p>
      </div>
    </div>
  );
}
