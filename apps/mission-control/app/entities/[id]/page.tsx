import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { PageShell } from "@/components/page-shell";
import { getEntityMemory } from "@/lib/services/entity-memory";

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function badgeClass(status: string): string {
  if (["processed", "approved", "decided", "done"].includes(status)) return "badge badge-green";
  if (["quarantined", "rejected", "failed"].includes(status)) return "badge border-red-300/30 bg-red-300/10 text-red-100";
  return "badge badge-muted";
}

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await requireWorkspaceId(`/entities/${id}`);
  const memory = await getEntityMemory(workspaceId, id);
  if (!memory) return notFound();
  const { entity, evidence, recommendations, decisions, actions, timeline } = memory;

  return (
    <PageShell
      title={entity.name}
      description="Company Memory detail: linked evidence, decisions, recommendations, actions, and timeline."
    >
      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">{entity.type}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{entity.name}</h2>
            <p className="mt-2 text-sm text-white/55">
              Confidence {Math.round(entity.confidence * 100)}% · {entity.evidenceRefs.length} direct evidence ref{entity.evidenceRefs.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-2xl font-semibold text-white">{evidence.length}</p>
              <p className="text-white/45">Evidence</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-2xl font-semibold text-white">{decisions.length}</p>
              <p className="text-white/45">Decisions</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-2xl font-semibold text-white">{recommendations.length}</p>
              <p className="text-white/45">Recommendations</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-2xl font-semibold text-white">{actions.length}</p>
              <p className="text-white/45">Actions</p>
            </div>
          </div>
          <Link href="/entities" className="btn-subtle inline-flex">Back to Company Memory</Link>
        </aside>

        <div className="space-y-4">
          <section className="panel">
            <p className="panel-title">Timeline</p>
            <ol className="mt-4 space-y-3">
              {timeline.length ? (
                timeline.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/35">{item.type}</p>
                        {item.href ? (
                          <Link href={item.href} className="mt-1 block font-medium text-white hover:text-nexus-accent">
                            {item.title}
                          </Link>
                        ) : (
                          <p className="mt-1 font-medium text-white">{item.title}</p>
                        )}
                        {item.meta ? <p className="mt-1 text-xs text-white/45">{item.meta}</p> : null}
                      </div>
                      <time className="text-xs text-white/35">{new Date(item.timestamp).toLocaleString()}</time>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-white/50">No timeline yet.</li>
              )}
            </ol>
          </section>

          <section className="panel">
            <p className="panel-title">Linked Evidence</p>
            <ul className="mt-4 space-y-3">
              {evidence.length ? evidence.map((record) => (
                <li key={record.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/evidence/${record.id}`} className="font-medium text-white hover:text-nexus-accent">
                      {fileName(record.sourcePath)}
                    </Link>
                    <span className={badgeClass(record.ingestionStatus)}>{record.ingestionStatus}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{record.sourceType} · {record.department ?? "unassigned"} · {Math.round(record.extractionConfidence * 100)}%</p>
                </li>
              )) : <li className="text-sm text-white/50">No linked evidence yet.</li>}
            </ul>
          </section>
        </div>
      </section>
    </PageShell>
  );
}
