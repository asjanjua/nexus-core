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

const SUGGESTIONS = [
  "What are the top risks right now?",
  "What decisions are waiting to be made?",
  "What is our execution status this week?",
];

function HistoryItem({ role, text }: { role: "user" | "assistant"; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 220;
  const label = role === "user" ? "You" : "NexusAI";
  const visibleText = expanded || !isLong ? text : `${text.slice(0, 220)}…`;

  return (
    <li className="space-y-1 rounded-lg border border-white/10 bg-black/10 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-white/40">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{visibleText}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs text-nexus-accent hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </li>
  );
}

export function AskPanel({ workspaceId, userId }: { workspaceId: string; userId: string }) {
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
          workspaceId,
          userId,
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
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/50 transition hover:border-nexus-accent/40 hover:text-white/80"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onAsk}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Thinking...
              </span>
            ) : (
              "Ask"
            )}
          </button>
          <span className="text-xs text-white/40">
            Answers are sourced from your ingested evidence only.
          </span>
        </div>
      </section>

      {error ? <section className="panel text-sm text-red-300">{error}</section> : null}

      {result ? (
        <section className="panel space-y-3">
          <p className="panel-title">Answer</p>

          {result.answer ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">{result.answer}</p>
          ) : (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              AI returned an empty response. Verify your LLM API key is set in your Render
              environment and the model name is correct (e.g.{" "}
              <code className="font-mono">deepseek-chat</code> or{" "}
              <code className="font-mono">claude-opus-4-6</code>).
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="badge">confidence {Math.round(result.confidence * 100)}%</span>
            <span className="badge">freshness {result.freshnessHours}h</span>
            <span className="badge">{result.evidenceRefs.length} ref{result.evidenceRefs.length !== 1 ? "s" : ""}</span>
            {result.refused && (
              <span className="badge border-amber-300/60 text-amber-200">refused</span>
            )}
          </div>

          {result.refusalReason && (
            <p className="text-xs text-white/60">Reason: {result.refusalReason}</p>
          )}

          {result.evidenceRefs.length > 0 && (
            <details className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
              <summary className="cursor-pointer text-xs text-white/45 transition hover:text-white/70">
                {result.evidenceRefs.length} source{result.evidenceRefs.length !== 1 ? "s" : ""} used
              </summary>
              <ul className="mt-2 space-y-1">
                {result.evidenceRefs.map((ref) => (
                  <li key={ref} className="truncate font-mono text-xs text-white/30">
                    {ref}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="flex items-center justify-between">
          <p className="panel-title">Conversation History</p>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-xs text-white/30 transition hover:text-white/60"
            >
              Clear
            </button>
          )}
        </div>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {history.length ? (
            history.map((item, index) => (
              <HistoryItem key={`${item.role}-${index}`} role={item.role} text={item.text} />
            ))
          ) : (
            <li className="text-white/60">No messages yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
