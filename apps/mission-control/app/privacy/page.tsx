import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy and Customer Data"
      summary="NexusAI is designed around customer-owned evidence, provenance, and human approval. This page summarizes the intended V1 data posture."
      sections={[
        {
          title: "Customer data ownership",
          body: "Customers retain ownership of documents, evidence, metadata, and business context uploaded or connected to NexusAI. NexusAI uses that data to provide the requested workspace intelligence experience.",
        },
        {
          title: "Evidence and provenance",
          body: "Uploaded documents are processed into evidence records with source path, timestamp, hash, sensitivity, extraction confidence, and freshness metadata so users can trace outputs back to sources.",
        },
        {
          title: "AI processing",
          body: "AI providers may be used for classification, synthesis, summaries, recommendations, and retrieval. Workspace policy should control which providers are allowed and which data classes may be processed.",
        },
        {
          title: "Sensitive data",
          body: "Restricted or low-confidence evidence should be blocked from Slack and other secondary surfaces. Future local-edge options are intended for customers who do not want original files or raw text processed in the cloud.",
        },
      ]}
    />
  );
}
