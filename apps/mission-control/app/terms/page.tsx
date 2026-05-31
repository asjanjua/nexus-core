import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Pilot Terms"
      title="Terms and Conditions"
      summary="These pilot terms describe how NexusAI should be used during evaluation. They are a product-facing summary, not a replacement for a signed commercial agreement."
      sections={[
        {
          title: "Human review required",
          body: "NexusAI generates evidence-backed analysis, recommendations, and drafts. Users remain responsible for reviewing outputs before relying on them for executive, operational, financial, legal, HR, or customer-facing decisions.",
        },
        {
          title: "No autonomous commitments",
          body: "V1 does not authorize autonomous financial transactions, legal commitments, HR actions, contract approvals, social posting, or writebacks into customer systems. Any consequential action must be approved by an authorized user.",
        },
        {
          title: "Pilot software",
          body: "NexusAI Mission Control is pilot software. Features, connectors, dashboards, and data models may change as the product is improved. Customers should validate outputs against source systems and original evidence.",
        },
        {
          title: "Commercial use",
          body: "Public source distribution is licensed for noncommercial use. Commercial pilots, hosted deployments, managed services, and enterprise use require a separate commercial agreement.",
        },
      ]}
    />
  );
}
