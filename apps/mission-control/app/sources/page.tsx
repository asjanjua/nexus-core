import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";
import { repository } from "@/lib/data/repository";

export default async function SourcesPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const rows = await repository.getEvidenceForWorkspace(workspaceId);
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.ingestionStatus] = (acc[row.ingestionStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell title="Sources" description="Source health, provenance metadata, and ingestion confidence.">
      <section className="panel">
        <p className="panel-title">Status Summary</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className="badge">
              {status}: {count}
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <p className="panel-title">Evidence Records</p>
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <p className="font-medium">{row.sourcePath}</p>
              <p className="text-white/60">
                {row.sourceType} · {row.ingestionStatus} · {Math.round(row.extractionConfidence * 100)}% confidence
              </p>
              <p className="text-white/60">hash: {row.hash}</p>
              <p className="text-white/60">timestamp: {row.sourceTimestamp}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
