"use client";

import { useState } from "react";

type Recommendation = {
  id: string;
  title: string;
  owner: string;
  status: string;
  confidence: number;
  evidenceRefs: string[];
};

export function RecommendationList({ initial }: { initial: Recommendation[] }) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, actor: "operator" })
    });
    const payload = await res.json();
    setBusyId(null);
    if (!res.ok || !payload.ok) return;
    const next = payload.data as Recommendation;
    setRows((prev) => prev.map((item) => (item.id === id ? next : item)));
  }

  return (
    <section className="panel">
      <p className="panel-title">Recommendation Queue</p>
      <ul className="mt-3 space-y-3">
        {rows.map((rec) => (
          <li key={rec.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-medium">{rec.title}</p>
            <p className="mt-1 text-xs text-white/60">
              {rec.owner} · status: {rec.status} · confidence {Math.round(rec.confidence * 100)}%
            </p>
            <p className="mt-1 text-xs text-white/60">Evidence: {rec.evidenceRefs.join(", ")}</p>
            <div className="mt-2 flex gap-2">
              <button
                className="btn-subtle"
                onClick={() => setStatus(rec.id, "approved")}
                disabled={busyId === rec.id}
              >
                Approve
              </button>
              <button
                className="btn-subtle"
                onClick={() => setStatus(rec.id, "rejected")}
                disabled={busyId === rec.id}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

