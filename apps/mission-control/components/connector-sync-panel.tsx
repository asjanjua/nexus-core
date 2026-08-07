"use client";

import { useState, useEffect, useCallback } from "react";

interface SyncRun {
  id: string;
  connectorId: string;
  connectorType: string;
  status: string;
  startedAt: string;
  recordsIngested: number;
  recordsFailed: number;
  errorMessage: string | null;
  retryCount: number;
  triggerType: string;
}

interface SyncHistoryResponse {
  connectors: number;
  runs: SyncRun[];
}

export function ConnectorSyncPanel() {
  const [data, setData] = useState<SyncHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/connector-sync-history");
      const json = await res.json();
      if (json.ok) setData(json.data ?? json);
    } catch {
      // silent — non-critical widget
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading || !data) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/30 text-center">
        Loading connector sync status…
      </div>
    );
  }

  const statusDot = (status: string) => {
    switch (status) {
      case "success": return "bg-green-500";
      case "failed": return "bg-nexus-danger";
      case "running": return "bg-blue-400 animate-pulse";
      default: return "bg-white/20";
    }
  };

  return (
    <section className="rounded border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/70">Connector Sync</p>
        <span className="text-[10px] text-white/30">
          {data.connectors} connector{data.connectors !== 1 ? "s" : ""}
        </span>
      </div>

      {data.runs.length === 0 && (
        <p className="text-[10px] text-white/30">No connectors configured.</p>
      )}

      <div className="space-y-2">
        {data.runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.01] px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot(run.status)}`} />
              <div className="min-w-0">
                <p className="text-[10px] text-white/70 truncate capitalize">
                  {run.connectorType.replace(/_/g, " ")}
                </p>
                <p className="text-[8px] text-white/30">
                  {run.recordsIngested} ingested
                  {run.recordsFailed > 0 && ` · ${run.recordsFailed} failed`}
                  {run.retryCount > 0 && ` · ${run.retryCount} retries`}
                </p>
              </div>
            </div>
            <span className={`text-[9px] shrink-0 ${
              run.status === "success" ? "text-green-400"
              : run.status === "failed" ? "text-nexus-danger"
              : "text-white/30"
            }`}>
              {run.status}
            </span>
          </div>
        ))}
      </div>

      {data.runs.some((r) => r.status === "failed") && (
        <div className="rounded border border-nexus-danger/20 bg-nexus-danger/[0.03] p-2">
          <p className="text-[9px] text-nexus-danger/70">
            {data.runs.filter((r) => r.status === "failed").length} connector(s) in error state.
            Check Settings → Connectors for details.
          </p>
        </div>
      )}
    </section>
  );
}
