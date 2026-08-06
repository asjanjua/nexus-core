"use client";

/**
 * Public status page — shows Pinavia system health.
 * No auth required. Fetches from /api/health.
 *
 * Designed for external uptime monitors (Checkly, UptimeRobot) and
 * pilot buyers who need to verify operational status.
 */

import { useState, useEffect } from "react";

interface HealthCheck {
  ok: boolean;
  reason?: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  environment: string;
  checks: {
    database: HealthCheck;
    vectorSearch: HealthCheck;
    originalsStorage: HealthCheck;
    llm: HealthCheck & { provider?: string };
  };
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((json) => setHealth(json.data ?? json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allOk = health?.status === "ok";

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Pinavia Status</h1>
          <p className="mt-2 text-sm text-white/50">System health at a glance</p>
        </div>

        {loading && <p className="text-center text-sm text-white/30">Checking…</p>}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-center">
            <p className="text-sm text-red-300">Health check failed</p>
            <p className="mt-1 text-xs text-red-400/60">{error}</p>
          </div>
        )}

        {health && (
          <div className="space-y-3">
            <div
              className={`rounded-lg border p-4 text-center ${
                allOk ? "border-green-400/30 bg-green-400/10" : "border-red-400/30 bg-red-400/10"
              }`}
            >
              <p className={`text-lg font-semibold ${allOk ? "text-green-300" : "text-red-300"}`}>
                {allOk ? "All systems operational" : "Degraded service"}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              <HealthRow label="Database" check={health.checks.database} />
              <HealthRow label="Vector Search" check={health.checks.vectorSearch} />
              <HealthRow label="R2 Storage" check={health.checks.originalsStorage} />
              <HealthRow
                label="LLM Provider"
                check={health.checks.llm}
                detail={health.checks.llm?.provider}
              />
            </div>

            <p className="text-center text-[10px] text-white/20">
              Refreshes on page load. Monitors should ping <code className="text-white/40">/api/health</code> every 60s.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthRow({
  label,
  check,
  detail,
}: {
  label: string;
  check: HealthCheck;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusDot ok={check.ok} />
        <span className="text-sm text-white/70">{label}</span>
      </div>
      <span className="text-xs text-white/30">
        {check.ok ? (detail ?? "Operational") : check.reason ?? "Unavailable"}
      </span>
    </div>
  );
}
