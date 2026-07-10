import { LegalPage } from "@/components/legal-page";

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Security"
      title="Security and Data Handling"
      summary="NexusAI V1 is built for governed pilot use: authenticated workspaces, scoped APIs, evidence quarantine, approval gates, and restricted-surface controls."
      sections={[
        {
          title: "Authentication and workspace scope",
          body: "Mission Control uses Clerk-backed sign-in and workspace scoping. API routes are protected by session or scoped bearer token, and agent access should be issued through revocable keys.",
        },
        {
          title: "Evidence trust gateway",
          body: "Evidence with missing provenance or low extraction confidence is quarantined or staged for approval before it can influence dashboards, Ask answers, or recommendations.",
        },
        {
          title: "Approvals and audit trail",
          body: "Human approval is required for high-impact recommendations, canonical promotion, and outbound executive packs. Ingestion, review, recommendation, and policy actions should emit audit events.",
        },
        {
          title: "Secondary surfaces",
          body: "Slack and future messaging surfaces should remain safer and shorter than Mission Control. Restricted or unprovenanced content must be redacted or linked back to Mission Control instead of being posted directly.",
        },
      ]}
    />
  );
}
