"use client";

/**
 * Admin health widget — mini status panel for the /admin page.
 * Fetches /api/health and shows component status dots.
 */

import { useState, useEffect, useCallback } from "react";

interface HealthCheck {
  ok: boolean;
  reason?: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    database: HealthCheck;
    vectorSearch: HealthCheck;
    originalsStorage: HealthCheck;
    llm: HealthCheck & { provider?: string };
  };
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />;
}

export function AdminHealthWidget() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setHealth(json.data ?? json);
    } catch {
      // Silently degrade — this is a widget, not a critical surface.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const allOk = health?.status === "ok";

  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-white/40">System Health</p>
        <button className="text-[9px] text-white/20 hover:text-white/50" disabled={loading} onClick={fetchHealth}>
          {loading ? "…" : "↻"}
        </button>
      </div>
      <div className="mt-2 space-y-1.5">
        {health ? (
          <>
            <Row label="Database" ok={health.checks.database.ok} />
            <Row label="Vectors" ok={health.checks.vectorSearch.ok} />
            <Row label="R2" ok={health.checks.originalsStorage.ok} />
            <Row label="LLM" ok={health.checks.llm.ok} detail={health.checks.llm.provider} />
            <Row label="Overall" ok={allOk} />
          </>
        ) : (
          <p className="text-[10px] text-white/20">Loading…</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Dot ok={ok} />
        <span className="text-[10px] text-white/50">{label}</span>
      </div>
      <span className="text-[9px] text-white/25">{ok ? (detail ?? "up") : "down"}</span>
    </div>
  );
}
