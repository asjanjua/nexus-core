"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { HelpLabel } from "@/components/ui/help-dialog";

type TwinType = "decision_action" | "workflow_scorer" | "ops_review";
type TwinStatus = "draft" | "active" | "paused" | "archived";

type WorkflowTwin = {
  id: string;
  type: TwinType;
  name: string;
  status: TwinStatus;
  owner?: string | null;
  config: Record<string, unknown>;
  updatedAt: string;
};

type WorkflowRun = {
  id: string;
  twinId: string;
  summary: string;
  confidence: number;
  runAt: string;
  payload: Record<string, unknown>;
};

type Candidate = {
  type: string;
  label: string;
  score: number;
  frequency: number;
  pain: number;
  dataReadiness: number;
  risk: number;
  speedBenefit: number;
  reason: string;
  deferredBecause: string | null;
  recommended: boolean;
};

type Backcast = {
  targetState: string;
  timeHorizon: string;
  pilotScope: string;
  milestones: string[];
  requiredEvidence: string[];
  successMetrics: string[];
  approvalBoundaries: string[];
};

type RoiMeasurement = {
  id: string;
  workflowName: string;
  manualMinutes: number;
  nexusMinutes: number;
  runsPerMonth: number;
  minutesSavedPerRun: number;
  monthlyHoursSaved: number;
  speedGainPercent: number;
  reworkDelta: number;
  createdAt: string;
};

const DEFAULT_TWINS: Array<{ type: TwinType; name: string; owner: string }> = [
  { type: "workflow_scorer", name: "Workflow Twin Scorer", owner: "Strategy Office" },
  { type: "decision_action", name: "Decision & Action Twin", owner: "Executive Sponsor" },
  { type: "ops_review", name: "Ops Review Twin", owner: "Operations Lead" }
];

function asCandidates(value: unknown): Candidate[] {
  return Array.isArray(value)
    ? value.filter((item): item is Candidate => !!item && typeof item === "object" && "score" in item && "label" in item)
    : [];
}

function asRoiMeasurements(value: unknown): RoiMeasurement[] {
  return Array.isArray(value)
    ? value.filter((item): item is RoiMeasurement => !!item && typeof item === "object" && "minutesSavedPerRun" in item)
    : [];
}

function asBackcast(value: unknown): Backcast | null {
  return value && typeof value === "object" && "pilotScope" in value ? value as Backcast : null;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function WorkflowsPage() {
  const [twins, setTwins] = useState<WorkflowTwin[]>([]);
  const [runs, setRuns] = useState<Record<string, WorkflowRun[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [backcastForm, setBackcastForm] = useState({
    targetState: "By the end of the pilot, leadership can see every material decision, owner, blocker, and follow-up action from approved evidence in under 10 minutes.",
    functionName: "Executive decision cadence",
    timeHorizon: "6 weeks"
  });
  const [roiForm, setRoiForm] = useState({
    workflowName: "Weekly leadership review",
    manualMinutes: "180",
    nexusMinutes: "75",
    manualReworkCount: "3",
    nexusReworkCount: "1",
    runsPerMonth: "4",
    notes: ""
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-twins");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "workflow_load_failed");
      const nextTwins = json.data.twins as WorkflowTwin[];
      setTwins(nextTwins);
      const runEntries = await Promise.all(
        nextTwins.map(async (twin) => {
          const runRes = await fetch(`/api/workflow-twins/${twin.id}/run`);
          const runJson = await runRes.json();
          return [twin.id, runJson.ok ? runJson.data.runs as WorkflowRun[] : []] as const;
        })
      );
      setRuns(Object.fromEntries(runEntries));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load workflow twins.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const scorerTwin = useMemo(() => twins.find((twin) => twin.type === "workflow_scorer"), [twins]);
  const decisionTwin = useMemo(() => twins.find((twin) => twin.type === "decision_action"), [twins]);
  const scorerRun = scorerTwin ? runs[scorerTwin.id]?.[0] : null;
  const candidates = asCandidates(scorerRun?.payload?.candidates);
  const recommended = candidates.find((candidate) => candidate.recommended) ?? candidates[0];
  const backcast = asBackcast((decisionTwin ?? scorerTwin)?.config?.backcast);
  const measurements = asRoiMeasurements((decisionTwin ?? scorerTwin)?.config?.shadowMeasurements);
  const latestRoi = measurements[measurements.length - 1];

  async function createTwin(type: TwinType, name: string, owner: string) {
    setBusy(`create-${type}`);
    setMessage("");
    try {
      const res = await fetch("/api/workflow-twins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name, status: "active", owner, config: { source: "workflow_page" } })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "create_failed");
      await refresh();
      setMessage(`${name} created.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create workflow twin.");
    } finally {
      setBusy(null);
    }
  }

  async function ensureDefaultTwins() {
    for (const item of DEFAULT_TWINS) {
      if (!twins.some((twin) => twin.type === item.type)) {
        await createTwin(item.type, item.name, item.owner);
      }
    }
  }

  async function runTwin(twin: WorkflowTwin) {
    setBusy(`run-${twin.id}`);
    setMessage("");
    try {
      const res = await fetch(`/api/workflow-twins/${twin.id}/run`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "run_failed");
      await refresh();
      setMessage(`${twin.name} generated a new run.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not run workflow twin.");
    } finally {
      setBusy(null);
    }
  }

  async function saveBackcast() {
    const targetTwin = decisionTwin ?? scorerTwin;
    if (!targetTwin) {
      setMessage("Create a workflow twin first.");
      return;
    }
    setBusy("backcast");
    setMessage("");
    try {
      const res = await fetch(`/api/workflow-twins/${targetTwin.id}/backcast`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(backcastForm)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "backcast_failed");
      await refresh();
      setMessage("Backcast scope saved to the workflow twin.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save backcast.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRoi() {
    const targetTwin = decisionTwin ?? scorerTwin;
    if (!targetTwin) {
      setMessage("Create a workflow twin first.");
      return;
    }
    setBusy("roi");
    setMessage("");
    try {
      const res = await fetch(`/api/workflow-twins/${targetTwin.id}/shadow-roi`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(roiForm)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "roi_failed");
      await refresh();
      setMessage("Shadow ROI measurement saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save ROI measurement.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell
      title="Workflow Twins"
      description="Select the first workflow to pilot, backcast the target outcome, and measure time saved against the manual process."
    >
      {message ? (
        <div className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/10 px-4 py-3 text-sm text-nexus-accent">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="panel-title">
                <HelpLabel
                  title="Workflow Twin Scorer"
                  help="The scorer ranks possible pilot workflows by pain, data readiness, risk, speed benefit, and executive judgment. Use the top recommendation to choose a practical first pilot."
                >
                  Workflow Twin Scorer
                </HelpLabel>
              </p>
              <p className="mt-1 text-sm text-white/55">
                Scores candidate workflows by pain, data readiness, risk, speed benefit, and executive judgment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-subtle" disabled={loading || !!busy} onClick={ensureDefaultTwins}>
                Create starter twins
              </button>
              {scorerTwin ? (
                <button className="btn-primary" disabled={!!busy} onClick={() => runTwin(scorerTwin)}>
                  {busy === `run-${scorerTwin.id}` ? "Scoring..." : "Run scorer"}
                </button>
              ) : null}
            </div>
          </div>

          {!scorerTwin ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
              No scorer twin yet. Create starter twins to add the universal scorer, Decision & Action Twin, and Ops Review Twin.
            </div>
          ) : candidates.length ? (
            <div className="space-y-3">
              {recommended ? (
                <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                  <p className="text-xs uppercase text-green-300/70">Recommended first pilot</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{recommended.label}</h2>
                  <p className="mt-1 text-sm text-white/65">{recommended.reason}</p>
                </div>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase text-white/40">
                    <tr>
                      <th className="px-3 py-2">Workflow</th>
                      <th className="px-3 py-2">
                        <HelpLabel title="Workflow score" help="The overall score combines readiness, pain, risk, and benefit into one ranking. Higher means this workflow is a better first pilot candidate.">
                          Score
                        </HelpLabel>
                      </th>
                      <th className="px-3 py-2">
                        <HelpLabel title="Data readiness" help="Data readiness shows whether Nexus has enough usable evidence to support this workflow. Low data readiness usually means more uploads or connectors are needed first.">
                          Data
                        </HelpLabel>
                      </th>
                      <th className="px-3 py-2">
                        <HelpLabel title="Workflow risk" help="Risk captures compliance, operational, or judgment risk. High-risk workflows may still be valuable, but they need clearer approval boundaries.">
                          Risk
                        </HelpLabel>
                      </th>
                      <th className="px-3 py-2">
                        <HelpLabel title="Speed benefit" help="Speed estimates how much faster this workflow could become with Nexus support. Use it as a practical value signal, not a final ROI claim.">
                          Speed
                        </HelpLabel>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {candidates.map((candidate) => (
                      <tr key={candidate.type} className={candidate.recommended ? "bg-green-400/[0.06]" : ""}>
                        <td className="px-3 py-3">
                          <p className="font-medium text-white">{candidate.label}</p>
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">
                            {candidate.deferredBecause ?? candidate.reason}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-white">{candidate.score}/100</td>
                        <td className="px-3 py-3 text-white/70">{candidate.dataReadiness}</td>
                        <td className="px-3 py-3 text-white/70">{candidate.risk}</td>
                        <td className="px-3 py-3 text-white/70">{candidate.speedBenefit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-sm text-white/55">
              Scorer twin exists. Run it to produce the first ranked workflow recommendation.
            </div>
          )}
        </section>

        <section className="panel space-y-3">
          <p className="panel-title">Twin Inventory</p>
          {twins.length ? (
            <div className="space-y-2">
              {twins.map((twin) => (
                <div key={twin.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{twin.name}</p>
                      <p className="mt-1 text-xs text-white/40">{twin.type} · {twin.owner ?? "Unowned"}</p>
                    </div>
                    <span className="badge badge-muted">{twin.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
                    <span>{runs[twin.id]?.length ?? 0} run(s)</span>
                    <button className="text-nexus-accent hover:underline" disabled={!!busy} onClick={() => runTwin(twin)}>
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
              No workflow twins have been created yet.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel space-y-4">
          <div>
            <p className="panel-title">
              <HelpLabel
                title="Backcast the pilot"
                help="Backcasting starts with the outcome you want at the end of the pilot, then works backward to define scope, milestones, evidence, approvals, and success metrics."
              >
                Backcast the Pilot
              </HelpLabel>
            </p>
            <p className="mt-1 text-sm text-white/55">
              Start from the sponsor-visible outcome, then define the scope, evidence, approvals, and success metrics.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Function or cadence</label>
              <input className="input" value={backcastForm.functionName} onChange={(e) => setBackcastForm((f) => ({ ...f, functionName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Time horizon</label>
              <input className="input" value={backcastForm.timeHorizon} onChange={(e) => setBackcastForm((f) => ({ ...f, timeHorizon: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Target state</label>
              <textarea className="input min-h-28" value={backcastForm.targetState} onChange={(e) => setBackcastForm((f) => ({ ...f, targetState: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" disabled={!!busy || !(decisionTwin ?? scorerTwin)} onClick={saveBackcast}>
            {busy === "backcast" ? "Saving..." : "Generate pilot backcast"}
          </button>
          {backcast ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <p className="font-medium text-white">{backcast.pilotScope}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-white/35">Milestones</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-white/60">
                    {backcast.milestones.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/35">Success metrics</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-white/60">
                    {backcast.successMetrics.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel space-y-4">
          <div>
            <p className="panel-title">
              <HelpLabel
                title="Shadow ROI"
                help="Shadow ROI compares the current manual process against a Nexus-assisted run before making commercial claims. It helps prove value with observed time saved and rework reduced."
              >
                Shadow ROI
              </HelpLabel>
            </p>
            <p className="mt-1 text-sm text-white/55">
              Compare one manual run against one Nexus-assisted run before making any commercial ROI claim.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Workflow measured</label>
              <input className="input" value={roiForm.workflowName} onChange={(e) => setRoiForm((f) => ({ ...f, workflowName: e.target.value }))} />
            </div>
            <div>
              <div className="label">
                <HelpLabel title="Manual minutes" help="How long this workflow usually takes without Nexus. Use the best honest estimate or an observed baseline from a recent run.">
                  Manual minutes
                </HelpLabel>
              </div>
              <input aria-label="Manual minutes" className="input" type="number" min="0" value={roiForm.manualMinutes} onChange={(e) => setRoiForm((f) => ({ ...f, manualMinutes: e.target.value }))} />
            </div>
            <div>
              <div className="label">
                <HelpLabel title="Nexus minutes" help="How long the same workflow takes with Nexus assisting. This should include human review time, not just AI processing time.">
                  Nexus minutes
                </HelpLabel>
              </div>
              <input aria-label="Nexus minutes" className="input" type="number" min="0" value={roiForm.nexusMinutes} onChange={(e) => setRoiForm((f) => ({ ...f, nexusMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="label">Manual rework count</label>
              <input className="input" type="number" min="0" value={roiForm.manualReworkCount} onChange={(e) => setRoiForm((f) => ({ ...f, manualReworkCount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nexus rework count</label>
              <input className="input" type="number" min="0" value={roiForm.nexusReworkCount} onChange={(e) => setRoiForm((f) => ({ ...f, nexusReworkCount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Runs per month</label>
              <input className="input" type="number" min="1" value={roiForm.runsPerMonth} onChange={(e) => setRoiForm((f) => ({ ...f, runsPerMonth: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confidence note</label>
              <input className="input" value={roiForm.notes} onChange={(e) => setRoiForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. first shadow run, sponsor observed" />
            </div>
          </div>
          <button className="btn-primary" disabled={!!busy || !(decisionTwin ?? scorerTwin)} onClick={saveRoi}>
            {busy === "roi" ? "Saving..." : "Save ROI measurement"}
          </button>
          {latestRoi ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-xs uppercase text-white/35">Saved per run</p>
                <p className="mt-1 text-2xl font-semibold text-white">{latestRoi.minutesSavedPerRun}m</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-xs uppercase text-white/35">Monthly saved</p>
                <p className="mt-1 text-2xl font-semibold text-white">{latestRoi.monthlyHoursSaved}h</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-xs uppercase text-white/35">Speed gain</p>
                <p className="mt-1 text-2xl font-semibold text-white">{latestRoi.speedGainPercent}%</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {scorerRun ? (
        <section className="panel">
          <p className="panel-title">Latest Scorer Run</p>
          <p className="mt-2 text-sm text-white/65">{scorerRun.summary}</p>
          <p className="mt-2 text-xs text-white/35">Confidence {pct(scorerRun.confidence)} · Run at {new Date(scorerRun.runAt).toLocaleString()}</p>
        </section>
      ) : null}
    </PageShell>
  );
}
