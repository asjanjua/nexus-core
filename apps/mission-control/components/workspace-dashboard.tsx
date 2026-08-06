"use client";

/**
 * Workspace Dashboard — per-workspace admin view for the company owner.
 *
 * Shows THEIR workspace metrics: token usage, evidence count, plan,
 * content summary (notes, evidence, decisions, recommendations), and
 * buyer lane / sponsor info.
 *
 * Fetches from GET /api/workspace/dashboard. Auth required (read:settings).
 * This is the COMPANY-level admin — not the Pinavia platform admin.
 */

import { useState, useEffect, useCallback } from "react";

interface WorkspaceDashboardData {
  workspaceId: string;
  generatedAt: string;
  plan: { key: string; planChangedAt: string | null };
  usage: { tokensUsed: number; tokensLimit: number; tokensPercent: number };
  content: { notes: number; evidenceCount: number; decisions: number; recommendations: number };
  profile: { buyerLane: string | null; sponsorName: string | null; activatedAt: string | null };
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export function WorkspaceDashboard() {
  const [data, setData] = useState<WorkspaceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/dashboard");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setData(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Workspace Dashboard</p>
          <p className="text-xs text-white/50">Your usage, plan, and content overview.</p>
        </div>
        <button className="btn-subtle text-xs" disabled={loading} onClick={fetchDashboard}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-xs text-nexus-danger">{error}</div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Token usage bar */}
          <div className="rounded border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Token Usage {data.plan?.key !== "free" ? `· ${data.plan.key}` : ""}</p>
            <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${data.usage.tokensPercent > 90 ? "bg-nexus-danger" : data.usage.tokensPercent > 70 ? "bg-amber-400" : "bg-green-400"}`}
                style={{ width: `${Math.min(data.usage.tokensPercent, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px]">
              <span className="text-white/50">{fmtTokens(data.usage.tokensUsed)} used</span>
              <span className="text-white/25">{fmtTokens(data.usage.tokensLimit)} limit</span>
            </div>
          </div>

          {/* Content counts */}
          <div className="grid grid-cols-4 gap-2">
            <CountCard label="Notes" value={data.content.notes} />
            <CountCard label="Evidence" value={data.content.evidenceCount} />
            <CountCard label="Decisions" value={data.content.decisions} />
            <CountCard label="Recs" value={data.content.recommendations} />
          </div>

          {/* Profile */}
          {(data.profile.buyerLane || data.profile.sponsorName) && (
            <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs space-y-1">
              {data.profile.buyerLane && (
                <div className="flex justify-between">
                  <span className="text-white/40">Buyer lane</span>
                  <span className="text-white/70">{data.profile.buyerLane}</span>
                </div>
              )}
              {data.profile.sponsorName && (
                <div className="flex justify-between">
                  <span className="text-white/40">Sponsor</span>
                  <span className="text-white/70">{data.profile.sponsorName}</span>
                </div>
              )}
              {data.profile.activatedAt && (
                <div className="flex justify-between">
                  <span className="text-white/40">Activated</span>
                  <span className="text-white/50">{new Date(data.profile.activatedAt).toLocaleDateString("en-GB")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}
