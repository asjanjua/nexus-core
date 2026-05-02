"use client";

import { useState } from "react";

type AskResult = {
  answer: string;
  confidence: number;
  freshnessHours: number;
  refused: boolean;
  refusalReason?: string;
  evidenceRefs: string[];
};

export function AskPanel() {
  const [query, setQuery] = useState("What are the top risks right now?");
  const [result, setResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "workspace-demo",
          userId: "user-demo",
          query
        })
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "ask_failed");
      const data = payload.data as AskResult;
      setResult(data);
      setHistory((prev) => [
        ...prev,
        { role: "user", text: query },
        { role: "assistant", text: data.answer }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <label className="mb-2 block text-sm text-white/80">Ask a workspace-scoped question</label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-primary" onClick={onAsk} disabled={loading}>
            {loading ? "Thinking..." : "Ask"}
          </button>
          <span className="text-xs text-white/60">
            Restricted or weak evidence will trigger refusal with reason.
          </span>
        </div>
      </section>

      {error ? <section className="panel text-sm text-red-300">{error}</section> : null}

      {result ? (
        <section className="panel space-y-2">
          <p className="panel-title">Answer</p>
          <p className="whitespace-pre-wrap text-sm text-white/85">{result.answer}</p>
          <div className="flex gap-2">
            <span className="badge">confidence {Math.round(result.confidence * 100)}%</span>
            <span className="badge">freshness {result.freshnessHours}h</span>
            {result.refused ? <span className="badge border-amber-300/60 text-amber-200">refused</span> : null}
          </div>
          {result.refusalReason ? <p className="text-xs text-white/60">Reason: {result.refusalReason}</p> : null}
          <p className="text-xs text-white/60">Evidence refs: {result.evidenceRefs.join(", ") || "none"}</p>
        </section>
      ) : null}

      <section className="panel">
        <p className="panel-title">Conversation History</p>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {history.length ? (
            history.map((item, index) => (
              <li key={`${item.role}-${index}`}>
                <span className="uppercase text-white/50">{item.role}</span>: {item.text}
              </li>
            ))
          ) : (
            <li className="text-white/60">No messages yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
