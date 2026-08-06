"use client";

/**
 * Eval Scorecard — displays the latest eval run results as a quality
 * scorecard: pass rate, category breakdown, per-case results with
 * keyword analysis, and trend across runs when multiple exist.
 *
 * Fetches from GET /api/eval/results (last 10 runs). Renders the
 * most recent run in detail with previous runs as a trend strip.
 */

import { useState, useEffect, useCallback } from "react";
import type { EvalRunSummary, EvalResult } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvalScorecard() {
  const [runs, setRuns] = useState<EvalRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/eval/results");
      const json = await res.json();
      setRuns(json.data?.runs ?? json.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load eval runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const latest = runs[0] ?? null;
  const previousRuns = runs.slice(1);
  // When only one run exists, previousRuns is [] and the trend strip
  // won't render — there's no history to trend against.

  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="panel-title">Trusted Eval Scorecard</p>
          <p className="mt-1 text-sm text-white/55">
            Golden-set agent quality — groundedness, keyword accuracy, latency.
          </p>
        </div>
        <button className="btn-subtle" disabled={loading} onClick={fetchRuns}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-4 py-3 text-sm text-nexus-danger">
          {error}
        </div>
      )}

      {!latest && !loading && !error && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
          No eval runs yet. Trigger an eval from the Settings → LLM tab to generate your first scorecard.
        </div>
      )}

      {latest && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Pass Rate" value={`${Math.round(latest.passRate * 100)}%`} tone={latest.passRate >= 0.8 ? "good" : "warning"} />
            <MetricCard label="Cases" value={`${latest.passed}/${latest.total}`} tone={latest.passed === latest.total ? "good" : "warning"} />
            <MetricCard label="Confidence" value={`${Math.round(latest.avgConfidence * 100)}%`} tone={latest.avgConfidence >= 0.8 ? "good" : "warning"} />
            <MetricCard label="Latency" value={`${latest.avgLatencyMs}ms`} tone="neutral" />
          </div>

          {/* Category breakdown */}
          <CategoryBreakdown results={latest.results} />

          {/* Trend strip — previous runs as miniature pass-rate bars */}
          {previousRuns.length > 0 && <TrendStrip runs={previousRuns} />}

          {/* Case detail — expandable */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-white/50">
              Cases ({latest.results.length})
            </h4>
            <div className="mt-2 space-y-1">
              {latest.results.map((r) => (
                <CaseCard
                  key={r.caseId}
                  result={r}
                  expanded={expandedCase === r.caseId}
                  onToggle={() => setExpandedCase(expandedCase === r.caseId ? null : r.caseId)}
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-white/25">
            Run {latest.id.slice(0, 8)} · {new Date(latest.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "good" | "warning" | "neutral" }) {
  const color = tone === "good" ? "text-green-300" : tone === "warning" ? "text-amber-300" : "text-white/70";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category breakdown — grouped bar
// ---------------------------------------------------------------------------

function CategoryBreakdown({ results }: { results: EvalResult[] }) {
  const groups = new Map<string, { total: number; passed: number }>();
  for (const r of results) {
    const cat = groups.get(r.category) ?? { total: 0, passed: 0 };
    cat.total++;
    if (r.passed) cat.passed++;
    groups.set(r.category, cat);
  }

  if (groups.size === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <h4 className="text-[10px] font-medium uppercase tracking-wide text-white/40">Category Breakdown</h4>
      <div className="mt-2 space-y-1.5">
        {[...groups.entries()].map(([cat, stats]) => (
          <div key={cat} className="flex items-center gap-2">
            <span className="w-28 text-xs text-white/60 truncate">{cat}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-green-400/70 transition-all"
                style={{ width: `${stats.total > 0 ? (stats.passed / stats.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-white/30 w-10 text-right">
              {stats.passed}/{stats.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend strip — small bars for prior runs
// ---------------------------------------------------------------------------

function TrendStrip({ runs }: { runs: EvalRunSummary[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/30 mr-1">Trend</span>
      {[...runs].reverse().map((run) => (
        <div
          key={run.id}
          className="group relative w-6"
          title={`${Math.round(run.passRate * 100)}% · ${new Date(run.createdAt).toLocaleDateString("en-GB")}`}
        >
          <div className="h-8 w-full rounded-sm bg-white/10 flex items-end">
            <div
              className="w-full rounded-sm bg-green-400/50 transition-all"
              style={{ height: `${run.passRate * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Case card — expandable detail
// ---------------------------------------------------------------------------

function CaseCard({ result, expanded, onToggle }: { result: EvalResult; expanded: boolean; onToggle: () => void }) {
  const tone = result.passed ? "border-green-400/30 bg-green-400/5" : "border-nexus-danger/30 bg-nexus-danger/5";
  const dot = result.passed ? "🟢" : "🔴";

  return (
    <div className={`rounded border ${tone} overflow-hidden`}>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/[0.03] transition-colors"
        onClick={onToggle}
      >
        <span className="text-xs">{dot}</span>
        <span className="flex-1 text-xs font-medium text-white/80 truncate">{result.caseId}</span>
        <span className="text-[10px] text-white/30">{result.category}</span>
        <span className="text-[10px] text-white/25">{result.latencyMs}ms</span>
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-3 py-2 space-y-1.5 bg-white/[0.01]">
          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.matchedKeywords.map((kw) => (
                <span key={kw} className="rounded-full bg-green-400/15 px-2 py-0.5 text-[10px] text-green-300">{kw}</span>
              ))}
            </div>
          )}
          {result.failedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.failedKeywords.map((kw) => (
                <span key={kw} className="rounded-full bg-nexus-danger/15 px-2 py-0.5 text-[10px] text-nexus-danger">{kw}</span>
              ))}
            </div>
          )}
          {result.forbiddenMatches.length > 0 && (
            <div>
              <p className="text-[10px] text-nexus-danger/60">⚠ Forbidden:</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {result.forbiddenMatches.map((kw) => (
                  <span key={kw} className="rounded-full bg-nexus-danger/10 px-2 py-0.5 text-[10px] text-nexus-danger/50">{kw}</span>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-white/30 line-clamp-3 mt-1">{result.actualOutput}</p>
          {result.notes && <p className="text-[10px] text-white/20 italic">{result.notes}</p>}
        </div>
      )}
    </div>
  );
}
