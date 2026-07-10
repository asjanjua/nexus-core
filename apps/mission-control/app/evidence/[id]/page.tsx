import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { EvidenceDeleteButton } from "@/components/evidence-delete-button";

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

export default async function EvidenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await repository.getEvidenceById(id);
  if (!row) return notFound();

  return (
    <PageShell title={`Evidence ${row.id}`} description="Inspect the source, confidence, freshness, and extracted text behind a NexusAI insight.">
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="panel space-y-4 text-sm text-white/85">
          <div>
            <p className="panel-title">Source</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{fileName(row.sourcePath)}</h2>
            <p className="mt-1 break-all text-xs text-white/45">{row.sourcePath}</p>
          </div>
          <div className="grid gap-2 text-xs text-white/60">
            <p>Type: {row.sourceType}</p>
            <p>Department: {row.department ?? "Unassigned"}</p>
            <p>Status: {row.ingestionStatus}</p>
            <p>Sensitivity: {row.sensitivity}</p>
            <p>Confidence: {Math.round(row.extractionConfidence * 100)}%</p>
            <p>Source timestamp: {row.sourceTimestamp}</p>
            <p>Ingested at: {row.ingestedAt}</p>
            <p className="break-all">Hash: {row.hash}</p>
          </div>
          {row.sourceUri?.startsWith("r2://") ? (
            <a
              href={`/api/evidence/${row.id}/original`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex"
            >
              Open original document
            </a>
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/45">
              Original document preview is not available for this source.
            </p>
          )}
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs text-white/40">
              Admin cleanup for bad pilot uploads or test records.
            </p>
            <EvidenceDeleteButton id={row.id} />
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">Extracted Text Preview</p>
          <div className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">
            {row.sensitivity === "restricted"
              ? "[REDACTED: restricted evidence]"
              : row.text.slice(0, 2400)}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
