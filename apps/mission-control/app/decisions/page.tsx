import { PageShell } from "@/components/page-shell";
import { store } from "@/lib/data/store";

export default function DecisionsPage() {
  const decisions = store.getDecisions("workspace-demo");

  return (
    <PageShell title="Decisions" description="Decision register with owner, rationale, and linked evidence.">
      <section className="panel">
        <ul className="space-y-3">
          {decisions.map((decision) => (
            <li key={decision.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-medium">{decision.title}</p>
              <p className="text-xs text-white/60">
                owner: {decision.owner} · status: {decision.status} · decidedAt: {decision.decidedAt ?? "pending"}
              </p>
              <p className="mt-2 text-sm text-white/80">{decision.rationale}</p>
              <p className="mt-1 text-xs text-white/60">Evidence: {decision.evidenceRefs.join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

