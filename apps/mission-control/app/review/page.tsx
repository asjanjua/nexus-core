import { auth } from "@clerk/nextjs/server";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";

export default async function ReviewPage() {
  const { orgId } = await auth();
  const workspaceId = orgId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  const recs = (await repository.getRecommendations(workspaceId)).filter(
    (item) => item.status === "in_review"
  );
  const allEvidence = await repository.getEvidenceForWorkspace(workspaceId);
  const quarantined = allEvidence.filter((item) => item.ingestionStatus === "quarantined");
  const pendingApproval = allEvidence.filter((item) => item.ingestionStatus === "pending_approval");
  const audit = (await repository.getAuditEvents(workspaceId)).slice(0, 20);

  return (
    <PageShell title="Review Queue" description="Human-in-the-loop checkpoints before promotion or outbound delivery.">
      <section className="panel">
        <p className="panel-title">In-Review Recommendations</p>
        <ul className="mt-3 space-y-2 text-sm">
          {recs.length ? recs.map((rec) => <li key={rec.id}>{rec.title}</li>) : <li className="text-white/50">No items in review.</li>}
        </ul>
      </section>

      <section className="panel">
        <p className="panel-title">
          Pending Approval
          {pendingApproval.length > 0 && (
            <span className="ml-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
              {pendingApproval.length}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Moderate-confidence records awaiting sign-off. Use the{" "}
          <a href="/approvals" className="text-nexus-accent hover:underline">Approvals</a> page to action them.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {pendingApproval.length ? (
            pendingApproval.map((item) => (
              <li key={item.id} className="text-white/70">
                {item.sourcePath.split("/").pop()} — {Math.round(item.extractionConfidence * 100)}% confidence
              </li>
            ))
          ) : (
            <li className="text-white/50">No items pending approval.</li>
          )}
        </ul>
      </section>

      <section className="panel">
        <p className="panel-title">Quarantined Evidence</p>
        <ul className="mt-3 space-y-2 text-sm">
          {quarantined.length ? (
            quarantined.map((item) => (
              <li key={item.id} className="text-white/70">
                {item.sourcePath.split("/").pop()} — {Math.round(item.extractionConfidence * 100)}% confidence
              </li>
            ))
          ) : (
            <li className="text-white/50">No quarantined evidence.</li>
          )}
        </ul>
      </section>

      <section className="panel">
        <p className="panel-title">Audit Trail (Latest 20)</p>
        <ul className="mt-3 space-y-2 text-xs text-white/70">
          {audit.length ? (
            audit.map((event) => (
              <li key={event.id}>
                {event.timestamp} · {event.type} · {event.actor}
              </li>
            ))
          ) : (
            <li className="text-white/50">No audit events yet.</li>
          )}
        </ul>
      </section>
    </PageShell>
  );
}
