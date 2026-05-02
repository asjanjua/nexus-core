import { cardsForRole } from "@/lib/services/dashboard";
import type { Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { DashboardCharts } from "@/components/dashboard-charts";

export async function DashboardPanel({ role }: { role: Role }) {
  const cards = await cardsForRole(role);
  const recs = await repository.getRecommendations("workspace-demo");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} className="panel">
            <p className="panel-title">{card.title}</p>
            <p className="mt-2 text-sm text-white/80">{card.summary}</p>
            <div className="mt-3 flex gap-2">
              <span className="badge">confidence {Math.round(card.confidence * 100)}%</span>
              <span className="badge">freshness {card.freshnessHours}h</span>
            </div>
            <p className="mt-2 text-xs text-white/50">Evidence: {card.evidenceRefs.join(", ")}</p>
          </article>
        ))}
      </div>
      <section className="panel">
        <p className="panel-title">Active Recommendations</p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {recs.map((rec) => (
            <li key={rec.id}>
              <span className="font-medium">{rec.title}</span>{" "}
              <span className="text-white/60">({rec.status})</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Role-specific chart analytics */}
      <section>
        <p className="text-xs uppercase tracking-wide text-white/40 mb-4">Analytics</p>
        <DashboardCharts role={role} />
      </section>
    </div>
  );
}
