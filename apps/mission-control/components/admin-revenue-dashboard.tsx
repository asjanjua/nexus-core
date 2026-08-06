"use client";

/**
 * Admin Revenue Dashboard — Pinavia platform-admin revenue + cost panel.
 *
 * Revenue side: MRR, ARR, active subscribers/pilots, churn, plan breakdown.
 * Cost side: LLM tokens/cost, estimated R2 storage, email sends, evidence count.
 *
 * This is the PLATFORM admin view — all workspaces aggregated.
 * Workspace-level admin data lives on individual dashboards.
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
  suspendedWorkspaces: number;
  planBreakdown: Record<string, number>;
  llmTokensThisMonth: number;
  llmCostMicrosThisMonth: number;
  evidenceCount: number;
  estimatedMonthlyLlmCostCents: number;
  estimatedMonthlyR2CostCents: number;
  estimatedMonthlyEmailCostCents: number;
}

function fmtDollars(cents: number): string {
  // Converts cents to a compact dollar string: 49900 → "$499", 150000 → "$1.5k"
  const usd = cents / 100;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

function fmtTokens(n: number): string {
  // Compact token count: 2500000 → "2.5M", 1500 → "1.5k", 500 → "500"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
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
          <p className="text-sm font-medium text-white">Revenue &amp; Cost Dashboard</p>
          <p className="mt-1 text-xs text-white/55">
            Pinavia platform view — all workspaces aggregated. Revenue vs operational burn rate.
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
        <div className="space-y-4">
          {/* Revenue KPIs */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Revenue</p>
            <div className="grid grid-cols-4 gap-2">
              <Metric label="MRR" value={fmtDollars(report.mrrCents)} />
              <Metric label="ARR" value={fmtDollars(report.arrCents)} />
              <Metric label="Active Pilots" value={`${report.activePilots}`} />
              <Metric label="Churned" value={`${report.churned30d}`} />
              <Metric label="Suspended" value={`${report.suspendedWorkspaces}`} warn={report.suspendedWorkspaces > 0} />
            </div>
          </div>

          {/* Cost KPIs */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-amber-400/50 mb-2">Operational Costs (estimated)</p>
            <div className="grid grid-cols-4 gap-2">
              <Metric label="LLM Tokens" value={fmtTokens(report.llmTokensThisMonth)} />
              <Metric label="LLM Cost" value={fmtDollars(report.estimatedMonthlyLlmCostCents)} />
              <Metric label="R2 Storage" value={fmtDollars(report.estimatedMonthlyR2CostCents)} />
              <Metric label="Email" value={fmtDollars(report.estimatedMonthlyEmailCostCents)} />
            </div>
          </div>

          {/* Runway: MRR ÷ burn */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-white/10 bg-white/[0.02] p-2">
              <p className="text-[9px] uppercase tracking-wide text-white/40">Evidence Records</p>
              <p className="text-sm font-semibold text-white">{report.evidenceCount.toLocaleString()}</p>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.02] p-2">
              <p className="text-[9px] uppercase tracking-wide text-white/40">Subscribers</p>
              <p className="text-sm font-semibold text-green-300">{report.activeSubscribers} <span className="text-[10px] text-white/30 font-normal">/ {report.totalWorkspaces}</span></p>
            </div>
            <div className="rounded border border-white/10 bg-white/[0.02] p-2">
              <p className="text-[9px] uppercase tracking-wide text-white/40">Burn Rate</p>
              <p className="text-sm font-semibold text-amber-300">
                {fmtDollars(report.estimatedMonthlyLlmCostCents + report.estimatedMonthlyR2CostCents + report.estimatedMonthlyEmailCostCents)}/mo
              </p>
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

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
      <p className={`text-lg font-semibold ${warn ? "text-amber-400" : "text-white"}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}
