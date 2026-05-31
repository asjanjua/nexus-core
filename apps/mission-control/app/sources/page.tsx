import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";
import { repository } from "@/lib/data/repository";
import { DeleteEvidenceButton } from "@/components/delete-evidence-button";
import Link from "next/link";

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const allRows = await repository.getEvidenceForWorkspace(workspaceId);
  const departments = Array.from(
    new Set(allRows.map((row) => row.department).filter((item): item is string => Boolean(item)))
  ).sort();
  const rows = allRows.filter(
    (row) =>
      (!filters.department || row.department === filters.department) &&
      (!filters.status || row.ingestionStatus === filters.status)
  );
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.ingestionStatus] = (acc[row.ingestionStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell title="Sources" description="See which files and systems are powering NexusAI, and whether they are fresh enough to trust.">
      <section className="panel">
        <p className="panel-title">Status Summary</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href="/sources" className={`badge ${!filters.department && !filters.status ? "badge-green" : "badge-muted"}`}>
            All sources
          </a>
          {Object.entries(byStatus).map(([status, count]) => (
            <a key={status} href={`/sources?status=${encodeURIComponent(status)}`} className="badge">
              {status}: {count}
            </a>
          ))}
        </div>
        {departments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="text-white/45">Departments:</span>
            {departments.map((department) => (
              <a
                key={department}
                href={`/sources?department=${encodeURIComponent(department)}`}
                className={`badge ${filters.department === department ? "badge-green" : "badge-muted"}`}
              >
                {department}
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <p className="panel-title">Evidence Records</p>
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/evidence/${row.id}`} className="font-medium text-white hover:text-nexus-accent">
                    {fileName(row.sourcePath)}
                  </Link>
                  <p className="mt-1 text-xs text-white/45">{row.sourcePath}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="badge">{row.ingestionStatus}</span>
                  <DeleteEvidenceButton id={row.id} name={fileName(row.sourcePath)} />
                </div>
              </div>
              <p className="mt-2 text-white/60">
                {row.department ? `${row.department} · ` : ""}{row.sourceType} · {Math.round(row.extractionConfidence * 100)}% confidence
              </p>
              <p className="mt-1 break-all text-xs text-white/40">hash: {row.hash}</p>
              <p className="text-xs text-white/40">timestamp: {row.sourceTimestamp}</p>
              {row.sourceUri?.startsWith("r2://") && (
                <Link href={`/evidence/${row.id}`} className="mt-2 inline-flex text-xs hover:underline">
                  View original document
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
