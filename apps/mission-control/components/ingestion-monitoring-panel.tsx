"use client";

/**
 * Ingestion Monitoring Panel — admin widget showing pipeline health.
 * Fetches from GET /api/admin/ingestion-stats.
 */

import { useState, useEffect, useCallback } from "react";

interface IngestionStats {
  total: number;
  processed: number;
  failed: number;
  quarantined: number;
  pending: number;
  successRate: number | null;
  avgConfidence: number | null;
  generatedAt: string;
}

export function IngestionMonitoringPanel() {
  const [stats, setStats] = useState<IngestionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ingestion-stats");
      const json = await res.json();
      if (json.ok) setStats(json.data ?? json);
    } catch {
      // silent — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/30 text-center">
        Loading pipeline stats…
      </div>
    );
  }

  const rateColor =
    stats.successRate === null ? "text-white/30"
    : stats.successRate >= 95 ? "text-green-400"
    : stats.successRate >= 80 ? "text-amber-400"
    : "text-nexus-danger";

  return (
    <section className="rounded border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/70">Ingestion Pipeline</p>
        <button className="text-[10px] text-white/30 hover:text-white/50" onClick={fetchStats}>
          Refresh
        </button>
      </div>

      {/* Success rate — large number */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${rateColor}`}>
          {stats.successRate ?? "—"}%
        </span>
        <span className="text-xs text-white/30">success rate</span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-1">
        <div className="rounded bg-green-500/10 p-1.5 text-center">
          <p className="text-xs font-mono font-medium text-green-400">{stats.processed}</p>
          <p className="text-[8px] text-green-500/50">done</p>
        </div>
        <div className="rounded bg-amber-400/10 p-1.5 text-center">
          <p className="text-xs font-mono font-medium text-amber-400">{stats.pending}</p>
          <p className="text-[8px] text-amber-400/50">pending</p>
        </div>
        <div className="rounded bg-orange-400/10 p-1.5 text-center">
          <p className="text-xs font-mono font-medium text-orange-400">{stats.quarantined}</p>
          <p className="text-[8px] text-orange-400/50">quar</p>
        </div>
        <div className="rounded bg-nexus-danger/10 p-1.5 text-center">
          <p className="text-xs font-mono font-medium text-nexus-danger">{stats.failed}</p>
          <p className="text-[8px] text-nexus-danger/50">failed</p>
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between text-[10px] text-white/30">
        <span>Avg confidence</span>
        <span className="text-white/50">{stats.avgConfidence ?? "—"}%</span>
      </div>
    </section>
  );
}
