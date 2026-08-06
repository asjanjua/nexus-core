import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Pinavia",
  description: "Contact Pinavia support, browse FAQ, and find pilot resources.",
};

const FAQ = [
  {
    q: "How do I start a pilot?",
    a: "Visit /start-pilot and create a workspace. You'll get a 30-day trial with full access. Your sponsor and reviewer seats are configured during onboarding.",
  },
  {
    q: "What happens after my trial ends?",
    a: "Your workspace transitions to the Free plan with reduced limits. Your data is preserved — nothing is deleted. Upgrade to a paid plan at any time from Workspace Settings.",
  },
  {
    q: "How secure is my data?",
    a: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use Clerk for identity, Neon for Postgres, and Cloudflare R2 for file storage. Each workspace is tenant-isolated at the database level.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. The Knowledge Workspace supports full markdown export. Evidence and agent outputs can be exported from their respective pages. Contact support for bulk exports.",
  },
  {
    q: "What LLM providers do you use?",
    a: "We route to Anthropic (Claude), DeepSeek, and OpenAI-compatible providers depending on your workspace configuration. No customer data is used to train models.",
  },
  {
    q: "How do I invite my team?",
    a: "Go to Settings → Workspace → Team. You can invite members by email. Each member gets role-based access matching their workspace role. Reviewer seats require explicit acceptance.",
  },
  {
    q: "What's the SLA for pilot customers?",
    a: "Pilot customers receive 4-hour response during business hours (GCC timezone, Sun-Thu). Critical issues (service unavailable) receive 1-hour response. See /pilot-kit for the full SLA document.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Support</h1>
          <p className="mt-4 text-lg text-white/50">
            Help, answers, and contact information for Pinavia pilots and users.
          </p>
        </div>

        {/* Contact */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-medium text-white">Contact us</h2>
          <p className="mt-2 text-sm text-white/55">
            Pilot customers:{" "}
            <a href="mailto:support@pinavia.io" className="text-nexus-accent hover:underline">
              support@pinavia.io
            </a>
          </p>
          <p className="mt-1 text-sm text-white/55">
            General inquiries:{" "}
            <a href="mailto:hello@pinavia.io" className="text-nexus-accent hover:underline">
              hello@pinavia.io
            </a>
          </p>
          <p className="mt-4 text-xs text-white/30">
            Response within 4 hours during GCC business hours (Sun–Thu, 9am–6pm GST).
            Critical issues (service unavailable) receive 1-hour response.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-medium text-white">Frequently asked questions</h2>
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-sm font-medium text-white">{item.q}</h3>
              <p className="mt-1 text-sm text-white/55">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Pilot resources */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-medium text-white">Pilot resources</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/55">
            <li>· <a href="/pilot-kit" className="text-nexus-accent hover:underline">Pilot Kit</a> — onboarding checklist, success scorecard, billing triggers</li>
            <li>· <a href="/pilot/paperwork" className="text-nexus-accent hover:underline">Pilot Paperwork</a> — SOW template, sponsor sign-off, value proof</li>
            <li>· <a href="/status" className="text-nexus-accent hover:underline">System Status</a> — real-time health dashboard</li>
            <li>· <a href="/security" className="text-nexus-accent hover:underline">Security</a> — data handling, encryption, compliance</li>
          </ul>
        </div>

        <p className="mt-16 text-center text-xs text-white/20">
          Pinavia FZCO · Dubai, UAE · support@pinavia.io
        </p>
      </div>
    </div>
  );
}
