import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { resolveDocumentTypes } from "@/lib/domain/document-type-classifier";

export const metadata = { title: "Data Room Index | Vantage" };

/**
 * Vantage Deal arc, screen 2. Primary user: diligence manager.
 *
 * What is actually in the data room, and what state it is in. Server-rendered
 * from the workspace's own evidence — no runner needed, because this asks a
 * question about the documents rather than about the checklist.
 *
 * Two honesty rules carried over from the rest of the evidence surfaces:
 *
 *   Restricted records are counted but never listed. A document the reviewer
 *   is not cleared to read must not leak its filename here, and pretending it
 *   does not exist would understate the room.
 *
 *   Quarantined and low-confidence extractions are shown as their own state
 *   rather than folded into the total. "412 documents" means nothing if a
 *   third of them failed to parse.
 */
export default async function VantageDataRoomPage() {
  const workspaceId = await requireWorkspaceId("/vantage/data-room");

  const [evidence, overrides] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.getEvidenceTypeOverrides(workspaceId).catch(() => new Map()),
  ]);

  const restricted = evidence.filter((r) => r.sensitivity === "restricted");
  const visible = evidence.filter((r) => r.sensitivity !== "restricted");

  const rows = visible
    .map((r) => ({
      id: r.id,
      path: r.sourcePath,
      fileName: r.sourcePath.split(/[/\\]/).pop() ?? r.sourcePath,
      status: r.ingestionStatus,
      confidence: r.extractionConfidence,
      types: resolveDocumentTypes(
        { sourcePath: r.sourcePath, text: r.text, classification: r.classification },
        overrides.get(r.id) ?? null
      ).types,
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  const untyped = rows.filter((r) => r.types.length === 0).length;
  const quarantined = rows.filter((r) => r.status === "quarantined").length;

  return (
    <PageShell
      title="Data Room Index"
      description="Every document Vantage can see for this deal, what it was identified as, and whether it parsed. Coverage is only as good as this list."
    >
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Documents</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">{rows.length}</p>
            <p className="mt-2 text-xs text-nexus-muted">readable in this workspace</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Not yet identified</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-warn">{untyped}</p>
            <p className="mt-2 text-xs text-nexus-muted">cannot satisfy any checklist item</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Quarantined</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-danger">{quarantined}</p>
            <p className="mt-2 text-xs text-nexus-muted">held back from analysis</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Restricted</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-muted">{restricted.length}</p>
            <p className="mt-2 text-xs text-nexus-muted">counted, not listed, not analysed</p>
          </div>
        </section>

        {rows.length === 0 ? (
          // Cold start as a designed state: what is missing, and the one action
          // that fixes it.
          <section className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
            <p className="text-sm font-semibold text-nexus-text">No documents in this deal room yet</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Vantage reads the same governed evidence as the rest of the workspace. Nothing has been
              ingested, so coverage, depth, and red flags have nothing to measure. Add the data room
              and every Vantage screen fills from it.
            </p>
            <Link href="/ingestion" className="btn-primary mt-3 inline-flex" prefetch={false}>
              Add documents
            </Link>
          </section>
        ) : (
          <section className="panel">
            <p className="panel-title">Documents</p>
            {untyped > 0 && (
              <p className="mt-1 text-xs leading-5 text-nexus-warn">
                {untyped} document{untyped === 1 ? " is" : "s are"} not identified, so they cannot count
                toward any requirement.{" "}
                <Link href="/evidence/review" className="underline hover:text-nexus-text" prefetch={false}>
                  Review them
                </Link>
                .
              </p>
            )}
            <div className="mt-3 space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="min-w-0">
                    <Link
                      href={`/evidence/${r.id}`}
                      className="truncate text-sm text-nexus-text hover:underline"
                      prefetch={false}
                    >
                      {r.fileName}
                    </Link>
                    <p className="mt-1 text-[11px] text-nexus-muted">
                      {r.types.length > 0 ? r.types.join(" · ") : "Not identified"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-nexus-muted">
                      {Math.round(r.confidence * 100)}% extraction
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] ${
                        r.status === "quarantined"
                          ? "border-nexus-danger/30 bg-nexus-danger/10 text-nexus-danger"
                          : r.status === "processed"
                            ? "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent"
                            : "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn"
                      }`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel border-nexus-danger/30">
          <p className="panel-title text-nexus-danger">Authority boundary</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            This is an index of what exists, not an assessment of it. Vantage cannot mark a deal
            approved, investable, or rejected.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
