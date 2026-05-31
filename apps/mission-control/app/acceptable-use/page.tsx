import { LegalPage } from "@/components/legal-page";

export default function AcceptableUsePage() {
  return (
    <LegalPage
      eyebrow="Acceptable Use"
      title="Acceptable Use Policy"
      summary="NexusAI should be used to improve governed business understanding, not to bypass human accountability or misuse sensitive information."
      sections={[
        {
          title: "Allowed use",
          body: "Use NexusAI to ingest approved business documents, create evidence-backed summaries, prepare internal briefs, identify risks, and draft recommendations for human review.",
        },
        {
          title: "Disallowed use",
          body: "Do not use NexusAI to make autonomous financial, HR, legal, medical, safety-critical, or external commitments. Do not use it to generate deceptive, harassing, spam, surveillance, or unauthorized access workflows.",
        },
        {
          title: "Sensitive data",
          body: "Only upload or connect data you are authorized to process. Use restricted labels and local/private processing modes for material that should not leave a customer-controlled environment.",
        },
        {
          title: "Connector actions",
          body: "Connector integrations should start read-only in V1. Any writeback, outbound message, post, or system-changing action must require explicit approval from an authorized user.",
        },
      ]}
    />
  );
}
