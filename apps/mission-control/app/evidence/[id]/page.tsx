import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { store } from "@/lib/data/store";

export default async function EvidenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = store.getEvidenceById(id);
  if (!row) return notFound();

  return (
    <PageShell title={`Evidence ${row.id}`} description="Provenance, confidence, and source freshness metadata.">
      <section className="panel space-y-2 text-sm text-white/85">
        <p>source type: {row.sourceType}</p>
        <p>source path: {row.sourcePath}</p>
        <p>source uri: {row.sourceUri ?? "n/a"}</p>
        <p>source timestamp: {row.sourceTimestamp}</p>
        <p>ingested at: {row.ingestedAt}</p>
        <p>hash: {row.hash}</p>
        <p>sensitivity: {row.sensitivity}</p>
        <p>confidence: {Math.round(row.extractionConfidence * 100)}%</p>
        <p>status: {row.ingestionStatus}</p>
        <p className="text-xs text-white/60">
          text excerpt:{" "}
          {row.sensitivity === "restricted"
            ? "[REDACTED: restricted evidence]"
            : row.text.slice(0, 400)}
        </p>
      </section>
    </PageShell>
  );
}
