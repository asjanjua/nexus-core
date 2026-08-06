import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance — Pinavia",
  description:
    "GCC and Pakistan regulatory compliance: PDPL, DPA, data residency, retention, breach response.",
};

const frameworks = [
  {
    region: "Pakistan",
    law: "Personal Data Protection Law (PDPL) 2023",
    summary:
      "Pinavia processes personal data under the authority of the data controller (the pilot workspace owner). All customer data is encrypted at rest (AES-256-GCM) and in transit (TLS 1.3). Data is hosted on Neon Postgres (ap-southeast-1, Singapore) with Cloudflare R2 for file storage.",
    key: "Cross-border transfer is supported because the data controller is based in Pakistan and processing infrastructure is in Singapore — a jurisdiction with adequate data protection standards under PDPL.",
  },
  {
    region: "United Arab Emirates",
    law: "Federal Decree-Law No. 45 of 2021 (PDPL)",
    summary:
      "Pinavia FZCO is a Dubai-registered entity. Data processing complies with UAE PDPL requirements for consent, purpose limitation, and data subject rights. The platform supports data localization through regional Neon deployment.",
    key: "Controller-processor relationship: the pilot workspace owner is the controller; Pinavia is the processor. A Data Processing Agreement template is available for signed pilot contracts.",
  },
  {
    region: "Kingdom of Saudi Arabia",
    law: "SAMA Cybersecurity Framework / NCA Essential Cybersecurity Controls",
    summary:
      "For KSA-regulated financial institutions, Pinavia supports evidence-bounded governance workflows that align with SAMA's cybersecurity maturity model and NCA-ECC controls. The platform's audit trail, approval chain enforcement, and evidence provenance match regulatory expectations for board-level technology governance.",
    key: "Pinavia does not hold a SAMA license and does not provide regulated financial services. It is a governance technology platform used by licensed entities under their own regulatory umbrella.",
  },
];

const commitments = [
  {
    title: "Data Residency",
    body: "All customer data is hosted on Neon Postgres in Singapore (ap-southeast-1). File storage uses Cloudflare R2. No customer data is stored in the United States or European Union unless explicitly configured.",
  },
  {
    title: "Retention & Deletion",
    body: "Workspace owners control data retention. Evidence and agent outputs can be deleted at any time. On workspace closure, all data is permanently deleted within 30 days. Backups are retained for 30 days (Neon point-in-time recovery).",
  },
  {
    title: "Breach Response",
    body: "In the event of a data breach, Pinavia will notify affected workspace owners within 72 hours of confirmation. A detailed incident report will be provided including root cause, affected data, and remediation steps. Contact security@nexusai.io for security disclosures.",
  },
  {
    title: "Subprocessors",
    body: "Pinavia uses the following subprocessors: Neon (database), Cloudflare (R2 storage, CDN), Clerk (identity), Anthropic/DeepSeek (LLM), Sentry (error monitoring), Plausible (analytics), Resend (email). No customer data is used to train third-party models.",
  },
  {
    title: "Data Processing Agreement",
    body: "A DPA template is available for signed pilot contracts. It covers controller-processor roles, data categories, processing purposes, subprocessor notification, data subject rights, and cross-border transfer safeguards. Contact hello@pinavia.io for a copy.",
  },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Compliance</h1>
          <p className="mt-4 text-lg text-white/50">
            GCC and Pakistan regulatory frameworks, data residency, and processing commitments.
          </p>
        </div>

        {/* Regional frameworks */}
        <div className="mt-12 space-y-6">
          <h2 className="text-lg font-medium text-white">Regional Frameworks</h2>
          {frameworks.map((fw) => (
            <div key={fw.region} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-medium text-white">
                {fw.region} — {fw.law}
              </h3>
              <p className="mt-2 text-sm text-white/55">{fw.summary}</p>
              <p className="mt-2 text-xs text-nexus-accent/70">{fw.key}</p>
            </div>
          ))}
        </div>

        {/* Commitments */}
        <div className="mt-12 space-y-6">
          <h2 className="text-lg font-medium text-white">Processing Commitments</h2>
          {commitments.map((c) => (
            <div key={c.title} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-sm font-medium text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-white/55">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/55">
            For compliance inquiries, DPA requests, or security disclosures:{" "}
            <a href="mailto:security@nexusai.io" className="text-nexus-accent hover:underline">
              security@nexusai.io
            </a>
          </p>
        </div>

        <p className="mt-12 text-center text-xs text-white/20">
          Pinavia FZCO · Dubai, UAE · Last updated August 2026
        </p>
      </div>
    </div>
  );
}
