/**
 * Pilot afterlife surface (P2, migration 0036).
 *
 * The lifecycle a pilot enters after a workflow is selected: run-loop status,
 * shadow-ROI (view existing measurements + capture a new one), the review-loop
 * signal, and the expand/hold/stop decision record. Read data comes from
 * GET /api/pilot/afterlife; ROI capture posts to the existing workflow-twin
 * shadow-roi route; the decision posts to POST /api/pilot/afterlife.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type Outcome = {
  status: "running" | "expand" | "hold" | "stop";
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
} | null;

type Afterlife = {
  selectedWorkflow: string | null;
  twinId: string | null;
  runLoop: { totalRuns: number; lastRunAt: string | null };
  roi: { measurementCount: number; monthlyHoursSaved: number; latest: { speedGainPercent?: number } | null };
  briefCount: number;
  approvalCount: number;
  outcome: Outcome;
  generatedAt: string;
};

const OUTCOME_STYLE: Record<string, { chip: string; label: string }> = {
  running: { chip: "bg-nexus-sky/15 text-nexus-sky", label: "Running" },
  expand: { chip: "bg-nexus-accent/15 text-nexus-accent", label: "Expand" },
  hold: { chip: "bg-nexus-warn/15 text-nexus-warn", label: "Hold" },
  stop: { chip: "bg-nexus-danger/15 text-nexus-danger", label: "Stop" },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-nexus-border bg-white/[0.02] p-4">
      <p className="text-xs uppercase text-nexus-muted">{label}</p>
      <p className="mt-1 text-4xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-nexus-muted">{helper}</p> : null}
    </div>
  );
}

export default function PilotAfterlifePage() {
  const [data, setData] = useState<Afterlife | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ROI capture
  const [manual, setManual] = useState("");
  const [nexus, setNexus] = useState("");
  const [runsPerMonth, setRunsPerMonth] = useState("4");
  const [roiBusy, setRoiBusy] = useState(false);
  const [roiMsg, setRoiMsg] = useState<string | null>(null);

  // Decision
  const [note, setNote] = useState("");
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/afterlife");
      const json = (await res.json()) as { ok: boolean; data?: Afterlife; error?: string };
      if (json.ok && json.data) setData(json.data);
      else setError("Could not load the pilot afterlife.");
    } catch {
      setError("Network error loading the pilot afterlife.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function captureRoi() {
    if (!data?.twinId || !data.selectedWorkflow) return;
    const manualMinutes = Number(manual);
    const nexusMinutes = Number(nexus);
    if (!Number.isFinite(manualMinutes) || !Number.isFinite(nexusMinutes)) {
      setRoiMsg("Enter both manual and Nexus minutes.");
      return;
    }
    setRoiBusy(true);
    setRoiMsg(null);
    try {
      const res = await fetch(`/api/workflow-twins/${encodeURIComponent(data.twinId)}/shadow-roi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: data.selectedWorkflow,
          manualMinutes,
          nexusMinutes,
          runsPerMonth: Number(runsPerMonth) || 4,
        }),
      });
      if (res.ok) {
        setManual("");
        setNexus("");
        setRoiMsg("Measurement captured.");
        await load();
      } else {
        setRoiMsg("Could not save the measurement.");
      }
    } finally {
      setRoiBusy(false);
    }
  }

  async function decide(status: "expand" | "hold" | "stop") {
    setDecisionBusy(status);
    try {
      const res = await fetch("/api/pilot/afterlife", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      if (res.ok) {
        setNote("");
        await load();
      }
    } finally {
      setDecisionBusy(null);
    }
  }

  const panel = "rounded-lg border border-nexus-border bg-nexus-panel p-4";

  return (
    <PageShell
      title="Pilot afterlife"
      description="What happens after a workflow is selected: keep the run loop moving, capture shadow-ROI as proof, and record the expand, hold, or stop decision."
    >
      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : error ? (
        <div className={panel}>
          <p className="text-sm text-nexus-danger">{error}</p>
        </div>
      ) : !data?.selectedWorkflow ? (
        <div className={panel}>
          <p className="text-sm text-white/70">
            No workflow is selected as the first pilot yet. Choose one to enter the pilot loop.
          </p>
          <a href="/workflows" className="btn-primary mt-3 inline-flex">
            Choose a pilot workflow
          </a>
        </div>
      ) : data ? (
        <>
          <div className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="label">Selected pilot</p>
                <p className="mt-1 text-sm font-semibold text-white">{data.selectedWorkflow}</p>
              </div>
              {data.outcome ? (
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${OUTCOME_STYLE[data.outcome.status].chip}`}
                >
                  {OUTCOME_STYLE[data.outcome.status].label}
                </span>
              ) : (
                <span className="badge badge-muted">No decision yet</span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Stat label="Twin runs" value={String(data.runLoop.totalRuns)} helper={`Last ${fmt(data.runLoop.lastRunAt)}`} />
              <Stat label="Briefs" value={String(data.briefCount)} helper="Agent outputs" />
              <Stat label="Approvals" value={String(data.approvalCount)} helper="Review-loop decisions" />
              <Stat
                label="Monthly hours saved"
                value={String(data.roi.monthlyHoursSaved)}
                helper={`${data.roi.measurementCount} ROI measurement(s)`}
              />
            </div>
          </div>

          <div className={panel}>
            <p className="label">Capture shadow ROI</p>
            <p className="mt-1 text-xs text-nexus-muted">
              Record the manual versus Nexus time for one run. Saved against the selected workflow twin.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="roi-manual">Manual minutes / run</label>
                <input id="roi-manual" className="input" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="90" />
              </div>
              <div>
                <label className="label" htmlFor="roi-nexus">Nexus minutes / run</label>
                <input id="roi-nexus" className="input" inputMode="numeric" value={nexus} onChange={(e) => setNexus(e.target.value)} placeholder="20" />
              </div>
              <div>
                <label className="label" htmlFor="roi-runs">Runs / month</label>
                <input id="roi-runs" className="input" inputMode="numeric" value={runsPerMonth} onChange={(e) => setRunsPerMonth(e.target.value)} placeholder="4" />
              </div>
            </div>
            {roiMsg ? <p className="mt-2 text-xs text-nexus-muted">{roiMsg}</p> : null}
            <button className="btn-primary mt-3" onClick={captureRoi} disabled={roiBusy}>
              {roiBusy ? "Saving…" : "Capture measurement"}
            </button>
          </div>

          <div className={panel}>
            <p className="label">Expand, hold, or stop</p>
            <p className="mt-1 text-xs text-nexus-muted">
              Record the pilot decision. This is the first-class outcome for this workflow and is audited.
            </p>
            {data.outcome ? (
              <p className="mt-2 text-xs text-nexus-muted">
                Last decision: <span className="text-white/80">{OUTCOME_STYLE[data.outcome.status].label}</span> by{" "}
                {data.outcome.decidedBy ?? "—"} on {fmt(data.outcome.decidedAt)}
                {data.outcome.note ? ` · "${data.outcome.note}"` : ""}
              </p>
            ) : null}
            <textarea
              className="input mt-3"
              rows={2}
              placeholder="Decision note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => decide("expand")} disabled={decisionBusy !== null}>
                {decisionBusy === "expand" ? "Saving…" : "Expand"}
              </button>
              <button className="btn-secondary" onClick={() => decide("hold")} disabled={decisionBusy !== null}>
                {decisionBusy === "hold" ? "Saving…" : "Hold"}
              </button>
              <button className="btn-secondary text-nexus-danger" onClick={() => decide("stop")} disabled={decisionBusy !== null}>
                {decisionBusy === "stop" ? "Saving…" : "Stop"}
              </button>
            </div>
          </div>

          <p className="text-xs text-nexus-muted">Generated {fmt(data.generatedAt)}.</p>
        </>
      ) : null}
    </PageShell>
  );
}
