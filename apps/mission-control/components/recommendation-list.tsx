"use client";

import { useState } from "react";
import { ConfidenceBadge } from "@/components/ui/trust-drawer-trigger";
import { ConsequencePreview, useConsequencePreview } from "@/components/ui/consequence-preview";
import { HelpLabel } from "@/components/ui/help-dialog";

type Recommendation = {
  id: string;
  title: string;
  owner: string;
  status: string;
  confidence: number;
  evidenceRefs: string[];
};

export function RecommendationList({
  initial,
  userId,
}: {
  initial: Recommendation[];
  userId: string;
}) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useConsequencePreview<string>((id, decision) => setStatus(id, decision));

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, actor: userId }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "update_failed");
      const next = payload.data as Recommendation;
      setRows((prev) => prev.map((item) => (item.id === id ? next : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel">
      <p className="panel-title">
        <HelpLabel
          title="Recommendation queue"
          help="Recommendations are generated from approved evidence. Review the confidence and source trail, then approve only when the recommendation is useful and safe to act on."
        >
          Recommendation Queue
        </HelpLabel>
      </p>

      {error && (
        <p className="mt-2 rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-white/40">
            No recommendations yet. Upload and process documents to generate AI recommendations.
          </li>
        ) : (
          rows.map((rec) => {
            const isBusy = busyId === rec.id;
            const isDone = ["approved", "rejected", "promoted"].includes(rec.status);
            return (
              <li
                key={rec.id}
                className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug">{rec.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-white/50">
                      <span>{rec.owner}</span>
                      <ConfidenceBadge
                        confidence={rec.confidence}
                        title={rec.title}
                        sources={rec.evidenceRefs.map((id) => ({ id }))}
                      />
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
                      rec.status === "approved" || rec.status === "promoted"
                        ? "border-green-500/40 bg-green-500/10 text-green-300"
                        : rec.status === "rejected"
                        ? "border-red-400/40 bg-red-400/10 text-red-300"
                        : rec.status === "in_review"
                        ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
                        : "border-white/20 bg-white/5 text-white/50",
                    ].join(" ")}
                  >
                    {rec.status.replace(/_/g, " ")}
                  </span>
                </div>

                {rec.evidenceRefs.length > 0 && (
                  <p className="text-xs text-white/30">
                    Based on {rec.evidenceRefs.length} source{rec.evidenceRefs.length !== 1 ? "s" : ""}
                  </p>
                )}

                {!isDone && (
                  <div className="flex gap-2 pt-1">
                    <button
                      className="rounded-lg bg-nexus-accent px-3 py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => preview.request(rec.id, "approved")}
                      disabled={isBusy}
                    >
                      {isBusy ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => preview.request(rec.id, "rejected")}
                      disabled={isBusy}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      {preview.pending && (
        <ConsequencePreview
          open
          decision={preview.pending.decision}
          itemLabel={rows.find((r) => r.id === preview.pending?.id)?.title ?? preview.pending.id}
          unlocks="Marks this recommendation as approved and removes it from the active review queue. It remains visible in history; no Decision or owner notification is created automatically — that's a separate step if you want one."
          stops="Marks this recommendation as rejected and removes it from the active queue. It will not be reconsidered automatically."
          leavesNexus={false}
          busy={preview.busy}
          onConfirm={preview.confirm}
          onCancel={preview.cancel}
        />
      )}
    </section>
  );
}
