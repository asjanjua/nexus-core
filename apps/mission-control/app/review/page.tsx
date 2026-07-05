import { safeAuth } from "@/lib/safe-auth";
import { PageShell } from "@/components/page-shell";
import { repository } from "@/lib/data/repository";

function eventTone(type: string): string {
  if (type.includes("deleted") || type.includes("failed")) return "border-red-400/30 bg-red-400/10 text-red-200";
  if (type.includes("approved") || type.includes("processed") || type.includes("stored")) return "border-green-400/30 bg-green-400/10 text-green-200";
  if (type.includes("status") || type.includes("review")) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-white/10 bg-white/5 text-white/70";
}

function humanEvent(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ReviewPage() {
  const { orgId, userId } = await safeAuth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  const recs = (await repository.getRecommendations(workspaceId)).filter(
    (item) => item.status === "in_review"
  );
  const allEvidence = await repository.getEvidenceForWorkspace(workspaceId);
  const quarantined = allEvidence.filter((item) => item.ingestionStatus === "quarantined");
  const pendingApproval = allEvidence.filter((item) => item.ingestionStatus === "pending_approval");
  const audit = (await repository.getAuditEvents(workspaceId)).slice(0, 20);

  return (
    <PageShell title="Review Queue" description="Evidence and recommendations waiting for review before they enter executive outputs.">
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
        <ul className="mt-3 space-y-3 text-xs text-white/70">
          {audit.length ? (
            audit.map((event) => (
              <li key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className={`rounded-full border px-2 py-0.5 ${eventTone(event.type)}`}>
                    {humanEvent(event.type)}
                  </span>
                  <span className="text-white/35">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-white/50">Actor: {event.actor}</p>
                {Object.keys(event.payload ?? {}).length > 0 && (
                  <pre className="mt-2 max-h-28 overflow-auto rounded bg-black/30 p-2 text-[11px] text-white/45">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
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
