"use client";

/**
 * Admin Revenue Dashboard — staff-gated revenue panel for the /admin page.
 * Fetches from GET /api/admin/revenue and displays MRR, ARR, subscriber
 * counts, churn, and plan breakdown.
 */

import { useState, useEffect, useCallback } from "react";

interface RevenueReport {
  generatedAt: string;
  activeSubscribers: number;
  totalWorkspaces: number;
  mrrCents: number;
  arrCents: number;
  activePilots: number;
  churned30d: number;
  planBreakdown: Record<string, number>;
}

function fmt(cents: number): string {
  const usd = cents / 100;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

export function AdminRevenueDashboard() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/revenue");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setReport(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Revenue Dashboard</p>
          <p className="mt-1 text-xs text-white/55">
            MRR, ARR, subscriber counts, churn, plan breakdown.
          </p>
        </div>
        <button className="btn-subtle text-xs" disabled={loading} onClick={fetchReport}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-xs text-nexus-danger">{error}</div>
      )}

      {report && (
        <div className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2">
            <Metric label="MRR" value={fmt(report.mrrCents)} />
            <Metric label="ARR" value={fmt(report.arrCents)} />
            <Metric label="Active Pilots" value={`${report.activePilots}`} />
            <Metric label="Churned" value={`${report.churned30d}`} />
          </div>

          {/* Subscriber detail */}
          <div className="rounded border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Subscribers</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-semibold text-green-300">{report.activeSubscribers}</span>
              <span className="text-xs text-white/30">of {report.totalWorkspaces} workspaces</span>
            </div>
          </div>

          {/* Plan breakdown */}
          {Object.keys(report.planBreakdown).length > 0 && (
            <div className="rounded border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/40">Plan Breakdown</p>
              <div className="mt-2 space-y-1">
                {Object.entries(report.planBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span className="text-xs text-white/70">{plan}</span>
                      <span className="text-xs text-white/40">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/20">{new Date(report.generatedAt).toLocaleString("en-GB")}</p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}
