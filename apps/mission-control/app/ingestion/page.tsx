import { IngestionUpload } from "@/components/ingestion-upload";
import { PageShell } from "@/components/page-shell";
import { store } from "@/lib/data/store";

export default function IngestionPage() {
  const rows = store.getEvidenceForWorkspace("workspace-demo");
  const quarantined = rows.filter((item) => item.ingestionStatus === "quarantined");

  return (
    <PageShell
      title="Ingestion"
      description="Deterministic extraction for docs/comms with trust gateway and quarantine."
    >
      <IngestionUpload />
      <section className="panel">
        <p className="panel-title">Quarantine Queue</p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {quarantined.length ? (
            quarantined.map((item) => (
              <li key={item.id}>
                {item.sourcePath} · confidence {Math.round(item.extractionConfidence * 100)}% · sensitivity{" "}
                {item.sensitivity}
              </li>
            ))
          ) : (
            <li>No quarantined records.</li>
          )}
        </ul>
      </section>
    </PageShell>
  );
}

