import { cardsForRole } from "@/lib/services/dashboard";
import type { Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { DashboardCharts } from "@/components/dashboard-charts";

export async function DashboardPanel({ role, workspaceId }: { role: Role; workspaceId: string }) {
  const cards = await cardsForRole(role, workspaceId);
  const recs = await repository.getRecommendations(workspaceId);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} className="panel">
            <p className="panel-title">{card.title}</p>
            <p className="mt-2 text-sm text-white/80 line-clamp-6">{card.summary}</p>
            <div className="mt-3 flex gap-2">
              <span className="badge">confidence {Math.round(card.confidence * 100)}%</span>
              <span className="badge">freshness {card.freshnessHours}h</span>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Based on {card.evidenceRefs.length} source{card.evidenceRefs.length !== 1 ? "s" : ""}
            </p>
          </article>
        ))}
      </div>
      <section className="panel">
        <p className="panel-title">Active Recommendations</p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {recs.length ? (
            recs.map((rec) => {
              const confPct = Math.round(rec.confidence * 100);
              const confColor =
                confPct >= 70 ? "text-green-300" : confPct >= 40 ? "text-amber-300" : "text-red-300";
              return (
                <li
                  key={rec.id}
                  className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 leading-snug">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">{rec.owner}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-medium ${confColor}`}>{confPct}%</p>
                    <p className="text-xs text-white/30">{rec.status}</p>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="py-4 text-center text-sm text-white/40">
              No recommendations yet. Ingest and process documents to generate AI-driven recommendations.
            </li>
          )}
        </ul>
      </section>

      {/* Role-specific chart analytics */}
      <section>
        <p className="text-xs uppercase tracking-wide text-white/40 mb-4">Analytics</p>
        <DashboardCharts role={role} workspaceId={workspaceId} />
      </section>
    </div>
  );
}
