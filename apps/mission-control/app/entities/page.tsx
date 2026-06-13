import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { entityTypeSchema } from "@/lib/contracts";

const ENTITY_TYPES = entityTypeSchema.options;

function confidenceLabel(value: number): string {
  const pct = Math.round(value * 100);
  if (pct >= 80) return `${pct}% high`;
  if (pct >= 55) return `${pct}% medium`;
  return `${pct}% needs review`;
}

export default async function EntitiesPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const parsedType = entityTypeSchema.safeParse(filters.type);
  const entities = await repository.listEntities(workspaceId, {
    type: parsedType.success ? parsedType.data : undefined,
    query: filters.q,
    limit: 250
  });
  const counts = entities.reduce<Record<string, number>>((acc, entity) => {
    acc[entity.type] = (acc[entity.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell
      title="Company Memory"
      description="Browse the people, projects, risks, KPIs, systems, and processes NexusAI has extracted from your evidence."
    >
      <section className="panel space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="panel-title">Entity Index</p>
            <p className="mt-1 text-sm text-white/50">
              {entities.length} memorized object{entities.length === 1 ? "" : "s"} in this workspace.
            </p>
          </div>
          <form className="flex gap-2">
            <input
              className="input min-w-0 md:w-72"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search company memory..."
            />
            {parsedType.success ? <input type="hidden" name="type" value={parsedType.data} /> : null}
            <button className="btn-subtle" type="submit">Search</button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/entities" className={`badge ${!parsedType.success ? "badge-green" : "badge-muted"}`}>
            All
          </Link>
          {ENTITY_TYPES.map((type) => (
            <Link
              key={type}
              href={`/entities?type=${encodeURIComponent(type)}`}
              className={`badge ${parsedType.success && parsedType.data === type ? "badge-green" : "badge-muted"}`}
            >
              {type.replaceAll("_", " ")}{counts[type] ? `: ${counts[type]}` : ""}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entities.length ? (
          entities.map((entity) => (
            <Link
              key={entity.id}
              href={`/entities/${entity.id}`}
              className="panel block transition hover:border-nexus-accent/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">{entity.type}</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">{entity.name}</h2>
                </div>
                <span className="badge">{confidenceLabel(entity.confidence)}</span>
              </div>
              <p className="mt-4 text-sm text-white/55">
                {entity.evidenceRefs.length} linked evidence source{entity.evidenceRefs.length === 1 ? "" : "s"}.
              </p>
            </Link>
          ))
        ) : (
          <div className="panel md:col-span-2 xl:col-span-3">
            <p className="text-sm text-white/55">
              No entities yet. Upload and process documents with enough confidence, then NexusAI will extract company memory objects automatically.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
