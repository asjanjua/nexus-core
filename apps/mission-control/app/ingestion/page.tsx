import { IngestionUpload } from "@/components/ingestion-upload";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";
import { repository } from "@/lib/data/repository";

export default async function IngestionPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const filters = await searchParams;
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const rows = await repository.getEvidenceForWorkspace(workspaceId);
  const departments = Array.from(
    new Set(rows.map((row) => row.department).filter((item): item is string => Boolean(item)))
  ).sort();
  const quarantined = rows.filter(
    (item) =>
      item.ingestionStatus === "quarantined" &&
      (!filters.department || item.department === filters.department)
  );

  return (
    <PageShell
      title="Ingestion"
      description="Upload documents to extract and analyse. High-confidence files go straight to your dashboard; others queue for review."
    >
      <IngestionUpload workspaceId={workspaceId} />
      <section className="panel">
        {departments.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <span className="text-white/45">Department:</span>
            <a href="/ingestion" className={`badge ${!filters.department ? "badge-green" : "badge-muted"}`}>All</a>
            {departments.map((department) => (
              <a
                key={department}
                href={`/ingestion?department=${encodeURIComponent(department)}`}
                className={`badge ${filters.department === department ? "badge-green" : "badge-muted"}`}
              >
                {department}
              </a>
            ))}
          </div>
        )}
        <p className="panel-title">
          Quarantine Queue
          {quarantined.length > 0 && (
            <span className="ml-2 rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-xs font-normal text-red-300">
              {quarantined.length}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Files with low extraction confidence or missing provenance are held here. Re-upload a better version or remove them.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {quarantined.length ? (
            quarantined.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-white/70">
                  {item.sourcePath.split("/").pop() ?? item.sourcePath}
                </span>
                <span className="shrink-0 text-white/40">
                  {Math.round(item.extractionConfidence * 100)}% · {item.sensitivity}
                </span>
              </li>
            ))
          ) : (
            <li className="text-white/50">No quarantined records.</li>
          )}
        </ul>
      </section>
    </PageShell>
  );
}
