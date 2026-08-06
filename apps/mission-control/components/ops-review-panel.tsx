"use client";

/**
 * Ops Review Twin Panel — weekly execution summary, blockers, overdue owners,
 * and KPI signals derived from the ops_review workflow twin run payload.
 *
 * The data is produced by buildWorkflowTwinRunInput in lib/services/workflow-twins.ts
 * and already fetched by the /workflows page. This component just renders it.
 */

import { HelpLabel } from "@/components/ui/help-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Action {
  id: string;
  title: string;
  owner: string;
  status: string;
  dueDate?: string | null;
  isBlocker?: boolean;
}

interface Decision {
  id: string;
  title: string;
  status: string;
  owner?: string;
}

interface Recommendation {
  id: string;
  title: string;
  status: string;
}

interface OpsReviewRun {
  id: string;
  summary: string;
  confidence: number;
  runAt: string;
  payload: {
    blockers?: Action[];
    overdueActions?: Action[];
    openDecisions?: Decision[];
    openRecommendations?: Recommendation[];
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  run: OpsReviewRun;
  onRunAgain?: () => void;
  busy?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpsReviewPanel({ run, onRunAgain, busy }: Props) {
  const { blockers = [], overdueActions = [], openDecisions = [], openRecommendations = [] } = run.payload;

  const hasContent = blockers.length > 0 || overdueActions.length > 0 || openDecisions.length > 0;

  return (
    <section className="panel space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="panel-title">
            <HelpLabel
              title="Ops Review Twin"
              help="The Ops Review Twin scans open decisions, blockers, and overdue actions across the workspace and produces a weekly execution snapshot. Run it after each leadership review or decision cycle."
            >
              Ops Review Twin
            </HelpLabel>
          </p>
          <p className="mt-1 text-sm text-white/55">
            Weekly execution snapshot — blockers, overdue actions, and open decisions.
          </p>
        </div>
        {onRunAgain && (
          <button className="btn-subtle" disabled={busy} onClick={onRunAgain}>
            {busy ? "Running…" : "Run again"}
          </button>
        )}
      </div>

      {!hasContent ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
          No blockers, overdue actions, or open decisions. The workspace is operating cleanly.
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Blockers" value={blockers.length} tone="danger" />
            <KpiCard label="Overdue" value={overdueActions.length} tone="warning" />
            <KpiCard label="Open decisions" value={openDecisions.length} tone="neutral" />
            <KpiCard label="Open recs" value={openRecommendations.length} tone="neutral" />
          </div>

          {/* Blockers */}
          {blockers.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-nexus-danger/80">
                Blockers ({blockers.length})
              </h4>
              <div className="mt-2 space-y-2">
                {blockers.map((b) => (
                  <div key={b.id} className="rounded-lg border border-nexus-danger/20 bg-nexus-danger/5 p-3">
                    <p className="text-sm font-medium text-white">{b.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
                      <span>Owner: {b.owner || "Unassigned"}</span>
                      {b.dueDate && <span>Due: {new Date(b.dueDate).toLocaleDateString("en-GB")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue actions */}
          {overdueActions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-amber-300/80">
                Overdue ({overdueActions.length})
              </h4>
              <div className="mt-2 space-y-2">
                {overdueActions.map((a) => (
                  <div key={a.id} className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
                      <span>Owner: {a.owner || "Unassigned"}</span>
                      {a.dueDate && <span>Due: {new Date(a.dueDate).toLocaleDateString("en-GB")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open decisions */}
          {openDecisions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-white/50">
                Open decisions ({openDecisions.length})
              </h4>
              <div className="mt-2 space-y-1">
                {openDecisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded border border-white/10 bg-white/[0.02] px-3 py-2">
                    <span className="text-sm text-white/80">{d.title}</span>
                    <span className="text-xs text-white/30">{d.owner || "Unassigned"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <p className="text-[11px] text-white/25">
            Generated {new Date(run.runAt).toLocaleString("en-GB")} · Confidence: {Math.round(run.confidence * 100)}%
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "neutral" }) {
  const colors = {
    danger: value > 0 ? "text-nexus-danger" : "text-white/30",
    warning: value > 0 ? "text-amber-300" : "text-white/30",
    neutral: "text-white/60",
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className={`text-2xl font-semibold ${colors[tone]}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}
