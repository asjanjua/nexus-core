"use client";

import { useState, useEffect } from "react";

type AskResult = {
  answer: string;
  confidence: number;
  freshnessHours: number;
  refused: boolean;
  refusalReason?: string;
  evidenceRefs: string[];
  agentKey?: string;
  escalationRequired?: boolean;
  escalationReason?: string;
};

const AGENT_OPTIONS = [
  { key: "", label: "General Ask" },
  { key: "strategy_agent", label: "Strategy Agent" },
  { key: "risk_agent", label: "Risk Agent" },
  { key: "decision_agent", label: "Decision Agent" },
  { key: "execution_agent", label: "Execution Agent" },
  { key: "finance_signal_agent", label: "Finance Signal Agent" },
  { key: "security_agent", label: "Security Agent" },
  { key: "ai_governance_agent", label: "AI Governance Agent" },
];

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
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-nexus-accent hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </li>
  );
}

export function AskPanel({
  workspaceId,
  userId,
  departments = [],
  initialQuery = "",
}: {
  workspaceId: string;
  userId: string;
  departments?: string[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery || "What are the top risks right now?");
  const [department, setDepartment] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fire when a first question comes in via ?q= URL param
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 4) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  async function onAsk() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          userId,
          query,
          department: department || undefined,
          agentKey: agentKey || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "ask_failed");
      const data = payload.data as AskResult;
      setResult(data);
      setHistory((prev) => [
        ...prev,
        { role: "user", text: query },
        { role: "assistant", text: data.answer },
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
          className="min-h-24 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm outline-none focus:border-nexus-accent/50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) onAsk(); }}
          placeholder="Ask anything about your business..."
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

        {/* Department filter — chips when available, text input fallback */}
        <div className="mt-3 max-w-sm">
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">
            Agent governance lens
          </label>
          <select
            className="input"
            value={agentKey}
            onChange={(e) => setAgentKey(e.target.value)}
          >
            {AGENT_OPTIONS.map((agent) => (
              <option key={agent.key || "general"} value={agent.key}>
                {agent.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/35">
            Agent lenses enforce their passports before evidence enters retrieval or the LLM.
          </p>
        </div>

        {/* Department filter — chips when available, text input fallback */}
        {departments.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-white/40">Filter by department</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDepartment("")}
                className={[
                  "rounded-full border px-3 py-1 text-xs transition",
                  !department
                    ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                    : "border-white/20 text-white/40 hover:border-white/40",
                ].join(" ")}
              >
                All
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartment(dept === department ? "" : dept)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    dept === department
                      ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                      : "border-white/20 text-white/40 hover:border-white/40",
                  ].join(" ")}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">
              Department filter
            </label>
            <input
              className="input max-w-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Optional — e.g. Finance or Risk & Compliance"
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
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
            Sourced from your ingested evidence only.
            {department && <span className="ml-1 text-nexus-accent/70">Filtered: {department}</span>}
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
              AI returned an empty response. Verify your LLM API key is set and the model name is correct.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="badge">confidence {Math.round(result.confidence * 100)}%</span>
            <span className="badge">freshness {result.freshnessHours}h</span>
            <span className="badge">{result.evidenceRefs.length} ref{result.evidenceRefs.length !== 1 ? "s" : ""}</span>
            {result.refused && (
              <span className="badge border-amber-300/60 text-amber-200">refused</span>
            )}
            {result.agentKey && <span className="badge">agent {result.agentKey}</span>}
            {result.escalationRequired && (
              <span className="badge border-amber-300/60 text-amber-200">human review required</span>
            )}
          </div>

          {result.refusalReason && (
            <p className="text-xs text-white/60">Reason: {result.refusalReason}</p>
          )}
          {result.escalationReason && !result.refusalReason && (
            <p className="text-xs text-amber-200/80">Escalation: {result.escalationReason}</p>
          )}

          {result.evidenceRefs.length > 0 && (
            <details className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
              <summary className="cursor-pointer text-xs text-white/45 transition hover:text-white/70">
                {result.evidenceRefs.length} source{result.evidenceRefs.length !== 1 ? "s" : ""} used
              </summary>
              <ul className="mt-2 space-y-1">
                {result.evidenceRefs.map((ref) => (
                  <li key={ref} className="truncate font-mono text-xs text-white/30">{ref}</li>
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
