import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";
import { auth } from "@clerk/nextjs/server";
import { EvidenceSourceList } from "@/components/evidence-source-list";

export default async function DecisionsPage() {
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const [decisions, evidence] = await Promise.all([
    repository.getDecisions(workspaceId),
    repository.getEvidenceForWorkspace(workspaceId),
  ]);

  return (
    <PageShell title="Decisions" description="Track what was decided, who owns it, and which sources support the rationale.">
      <section className="panel">
        <ul className="space-y-3">
          {decisions.map((decision) => (
            <li key={decision.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-medium">{decision.title}</p>
              <p className="text-xs text-white/60">
                owner: {decision.owner} · status: {decision.status} · decidedAt: {decision.decidedAt ?? "pending"}
              </p>
              <p className="mt-2 text-sm text-white/80">{decision.rationale}</p>
              <EvidenceSourceList records={evidence} ids={decision.evidenceRefs} />
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
