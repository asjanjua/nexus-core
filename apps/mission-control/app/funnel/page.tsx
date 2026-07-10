/**
 * Pilot funnel operator panel (P2).
 *
 * Two honest views over existing signals (see lib/services/funnel.ts):
 *   - Acquisition funnel: readiness submitted -> claim emailed -> redeemed.
 *   - Pilot-stage tracker: the caller's workspace lifecycle, one real signal
 *     per stage, one current next-action.
 *
 * Also a regulated-buyer demo asset: shows the governed pipeline end to end.
 */
"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { AcquisitionFunnel, PilotStage } from "@/lib/services/funnel";

type FunnelData = {
  acquisition: AcquisitionFunnel;
  pilotStages: PilotStage[];
  generatedAt: string;
};

const STAGE_STYLE: Record<PilotStage["status"], { chip: string; label: string }> = {
  done: { chip: "bg-nexus-accent/15 text-nexus-accent", label: "Done" },
  current: { chip: "bg-nexus-warn/15 text-nexus-warn", label: "Now" },
  pending: { chip: "bg-white/5 text-white/40", label: "Pending" },
};

function FunnelStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-nexus-border bg-white/[0.02] p-4">
      <p className="text-xs uppercase text-nexus-muted">{label}</p>
      <p className="mt-1 text-4xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-nexus-muted">{helper}</p> : null}
    </div>
  );
}

export default function FunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/funnel");
        const json = (await res.json()) as { ok: boolean; data?: FunnelData; error?: string };
        if (cancelled) return;
        if (json.ok && json.data) setData(json.data);
        else setError("Could not load funnel data.");
      } catch {
        if (!cancelled) setError("Network error loading funnel data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const panel = "rounded-lg border border-nexus-border bg-nexus-panel p-4";

  return (
    <PageShell
      title="Pilot funnel"
      description="The governed pipeline end to end: acquisition from the readiness assessment, then each workspace's pilot lifecycle. Every number is read from real product signals, not estimated."
    >
      {loading ? (
        <p className="text-sm text-white/50">Loading funnel…</p>
      ) : error ? (
        <div className={panel}>
          <p className="text-sm text-nexus-danger">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className={panel}>
            <p className="label">Acquisition</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <FunnelStat label="Assessments" value={String(data.acquisition.submitted)} helper="Readiness submitted" />
              <FunnelStat label="Claims emailed" value={String(data.acquisition.claimsSent)} helper="Continue links sent" />
              <FunnelStat label="Redeemed" value={String(data.acquisition.redeemed)} helper="Claimed at signup" />
              <FunnelStat
                label="Redeem rate"
                value={`${data.acquisition.redeemRatePct}%`}
                helper="Redeemed / assessments"
              />
            </div>
            {data.acquisition.submitted === 0 ? (
              <p className="mt-3 text-xs text-nexus-muted">
                No readiness assessments recorded yet. Counts fill in as the public assessment is used.
              </p>
            ) : null}
          </div>

          <div className={panel}>
            <p className="label">Pilot lifecycle (this workspace)</p>
            <ol className="mt-3 space-y-2">
              {data.pilotStages.map((stage, i) => {
                const style = STAGE_STYLE[stage.status];
                return (
                  <li
                    key={stage.key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xs text-nexus-muted">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{stage.label}</p>
                        <p className="mt-0.5 text-xs text-nexus-muted">{stage.detail}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${style.chip}`}
                    >
                      {style.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="text-xs text-nexus-muted">
            Generated {new Date(data.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        </>
      ) : null}
    </PageShell>
  );
}
