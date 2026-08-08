import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { repository } from "@/lib/data/repository";
import { resolveDocumentTypes } from "@/lib/domain/document-type-classifier";
import { nucleusEngagementStages } from "@/lib/nucleus-engagement-workflow";

export const metadata = { title: "Evidence Room Template | Nucleus" };

/**
 * Nucleus Delivery arc, screen 1. Primary user: engagement manager.
 *
 * What the methodology needs from the client, checked against what has
 * actually been collected. No new persistence: the required objects are
 * already declared per stage in the engagement registry, and the collected
 * side is the workspace's own governed evidence.
 *
 * MATCHED LOOSELY, AND SAID SO. A stage declares required objects in the
 * firm's language ("Method pack", "Client evidence set"); the classifier types
 * documents in its own vocabulary. Those two do not share a controlled list,
 * so this page reports a case-insensitive substring match and labels it a
 * likely match rather than presenting it as coverage. Overstating here would
 * tell a partner they are ready when they are not — the failure mode this
 * product exists to prevent.
 */
export default async function NucleusEvidenceRoomPage() {
  const workspaceId = await requireWorkspaceId("/nucleus/evidence-room");

  const [evidence, overrides] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId).catch(() => []),
    repository.getEvidenceTypeOverrides(workspaceId).catch(() => new Map()),
  ]);

  const usable = evidence.filter((r) => r.sensitivity !== "restricted");
  const typed = usable.map((r) => ({
    id: r.id,
    fileName: r.sourcePath.split(/[/\\]/).pop() ?? r.sourcePath,
    types: resolveDocumentTypes(
      { sourcePath: r.sourcePath, text: r.text, classification: r.classification },
      overrides.get(r.id) ?? null
    ).types,
  }));

  const stages = nucleusEngagementStages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    objects: stage.requiredObjects.map((obj) => {
      const needle = obj.toLowerCase();
      const matches = typed.filter((d) =>
        d.types.some((t) => t.toLowerCase().includes(needle) || needle.includes(t.toLowerCase()))
      );
      return { obj, matches };
    }),
  }));

  const totalObjects = stages.reduce((n, s) => n + s.objects.length, 0);
  const withMatch = stages.reduce((n, s) => n + s.objects.filter((o) => o.matches.length > 0).length, 0);

  return (
    <PageShell
      title="Evidence Room Template"
      description="What the methodology asks the client for, against what has actually been collected. Matches are indicative — the firm's vocabulary and the classifier's are not the same list."
    >
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Required objects</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">{totalObjects}</p>
            <p className="mt-2 text-xs text-nexus-muted">across {stages.length} stages</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">With a likely match</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-sky">{withMatch}</p>
            <p className="mt-2 text-xs text-nexus-muted">needs a human to confirm</p>
          </div>
          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-nexus-muted">Documents readable</p>
            <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">{typed.length}</p>
            <p className="mt-2 text-xs text-nexus-muted">restricted files excluded</p>
          </div>
        </section>

        {typed.length === 0 && (
          <section className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
            <p className="text-sm font-semibold text-nexus-text">Nothing collected yet</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              The template below is what the methodology asks for. Once client documents are
              ingested, each row shows what has arrived against it.
            </p>
            <Link href="/ingestion" className="btn-primary mt-3 inline-flex" prefetch={false}>
              Add client documents
            </Link>
          </section>
        )}

        {stages.map((stage) => (
          <section key={stage.id} className="panel">
            <p className="panel-title">{stage.title}</p>
            <div className="mt-3 space-y-2">
              {stage.objects.map(({ obj, matches }) => (
                <div key={obj} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-nexus-text">{obj}</p>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] ${
                      matches.length > 0
                        ? "border-nexus-sky/30 bg-nexus-sky/10 text-nexus-sky"
                        : "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn"
                    }`}>
                      {matches.length > 0 ? `${matches.length} likely match` : "nothing collected"}
                    </span>
                  </div>
                  {matches.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {matches.slice(0, 4).map((m) => (
                        <li key={m.id} className="truncate text-[11px] text-nexus-sky">
                          <Link href={`/evidence/${m.id}`} className="hover:underline" prefetch={false}>
                            {m.fileName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="panel border-nexus-warn/30">
          <p className="panel-title text-nexus-warn">This is not coverage</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            A likely match means a collected document&apos;s type resembles what the stage asks for. It is
            a prompt for a human to confirm, not an assertion that the requirement is satisfied.
            Nucleus does not certify readiness.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
