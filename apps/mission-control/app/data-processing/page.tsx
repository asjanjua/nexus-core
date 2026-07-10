import { LegalPage } from "@/components/legal-page";

export default function DataProcessingPage() {
  return (
    <LegalPage
      eyebrow="Enterprise Data Processing"
      title="Data Processing Addendum Placeholder"
      summary="This placeholder records the intended enterprise DPA shape for pilots that require formal data-processing terms before deployment."
      sections={[
        {
          title: "Purpose",
          body: "The future DPA will define the customer as controller or data owner, NexusAI as processor or service provider where applicable, and the permitted processing activities for the pilot.",
        },
        {
          title: "Processing scope",
          body: "Expected processing includes ingestion, extraction, classification, evidence storage, embeddings, retrieval, dashboard synthesis, recommendations, approvals, audit events, and export generation.",
        },
        {
          title: "Subprocessors",
          body: "The DPA should list infrastructure, auth, database, object storage, and model providers used for the selected deployment mode, including any customer-approved local or private-cloud alternatives.",
        },
        {
          title: "Controls",
          body: "The DPA should cover data retention, deletion, key rotation, access controls, audit logs, incident notification, restricted data handling, and local-only processing requirements.",
        },
      ]}
    />
  );
}
