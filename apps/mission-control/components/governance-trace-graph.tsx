"use client";

/**
 * Governance Trace — makes the agent graph Nexus already runs legible.
 *
 * Every brief is produced by: evidence -> specialist agent output -> (any
 * red-team/output-gate check) -> decision -> action, plus the parallel
 * evidence -> recommendation chain. That pipeline runs on every request
 * (see dispatcher.ts, red-team.ts, synthesis.ts) but was previously
 * invisible. This screen answers the one test every Nexus screen is judged
 * against: can I trust this enough to approve it, and can I prove later
 * that I was right to.
 */

import { useEffect, useMemo, useState } from "react";

type TraceNode = { id: string; label: string; type: string };
type TraceEdge = { id: string; source: string; target: string; type: string; label?: string };
type TraceGraph = { nodes: TraceNode[]; edges: TraceEdge[] };

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All rooms" },
  { value: "ceo", label: "Executive" },
  { value: "coo", label: "Operating" },
  { value: "cbo", label: "Growth" },
  { value: "cto", label: "Technology" },
  { value: "cfo", label: "Finance" },
  { value: "chro", label: "People" },
  { value: "cro", label: "Risk" },
];

const DAY_OPTIONS = [7, 14, 30];

// Column 0 = evidence, 1 = agent output (+ checks), 2 = decision/recommendation, 3 = action.
const COLUMN_BY_TYPE: Record<string, number> = {
  evidence: 0,
  agent_output: 1,
  check_blocked: 1,
  check_escalated: 1,
  check_review: 1,
  decision: 2,
  recommendation: 2,
  recommendation_approved: 2,
  recommendation_rejected: 2,
  action: 3,
};

const NODE_STYLE: Record<string, { fill: string; stroke: string; ring: string }> = {
  evidence: { fill: "#8FC5FF", stroke: "rgba(143,197,255,0.35)", ring: "evidence" },
  agent_output: { fill: "#7A3FF2", stroke: "rgba(122,63,242,0.4)", ring: "AI output" },
  check_blocked: { fill: "#F08AA0", stroke: "rgba(240,138,160,0.4)", ring: "blocked" },
  check_escalated: { fill: "#F3C969", stroke: "rgba(243,201,105,0.4)", ring: "escalated" },
  check_review: { fill: "#F3C969", stroke: "rgba(243,201,105,0.4)", ring: "review" },
  decision: { fill: "#F7FAFF", stroke: "rgba(247,250,255,0.3)", ring: "decision" },
  action: { fill: "#A8B3C7", stroke: "rgba(168,179,199,0.35)", ring: "action" },
  recommendation: { fill: "#F7FAFF", stroke: "rgba(247,250,255,0.3)", ring: "recommendation" },
  recommendation_approved: { fill: "#64D8C4", stroke: "rgba(100,216,196,0.4)", ring: "approved" },
  recommendation_rejected: { fill: "#F08AA0", stroke: "rgba(240,138,160,0.4)", ring: "rejected" },
};

const LEGEND_ORDER = [
  "evidence",
  "agent_output",
  "check_blocked",
  "check_escalated",
  "decision",
  "action",
  "recommendation_approved",
  "recommendation_rejected",
];

const LEGEND_LABEL: Record<string, string> = {
  evidence: "Evidence",
  agent_output: "AI agent output",
  check_blocked: "Governance check — blocked",
  check_escalated: "Governance check — escalated",
  decision: "Decision",
  action: "Action",
  recommendation_approved: "Recommendation — approved",
  recommendation_rejected: "Recommendation — rejected",
};

function layout(graph: TraceGraph) {
  const width = 760;
  const height = 460;
  const colX = [70, 280, 490, 700];
  const byColumn = new Map<number, TraceNode[]>();

  for (const node of graph.nodes) {
    const col = COLUMN_BY_TYPE[node.type] ?? 1;
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col)!.push(node);
  }

  const pos = new Map<string, { x: number; y: number }>();
  for (const [col, nodes] of byColumn.entries()) {
    const top = 40;
    const bottom = height - 30;
    const spacing = nodes.length > 1 ? (bottom - top) / (nodes.length - 1) : 0;
    nodes.forEach((node, i) => {
      const y = nodes.length === 1 ? (top + bottom) / 2 : top + i * spacing;
      pos.set(node.id, { x: colX[col] ?? colX[1], y });
    });
  }

  return { pos, width, height };
}

export function GovernanceTraceGraph() {
  const [graph, setGraph] = useState<TraceGraph | null>(null);
  const [role, setRole] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    params.set("days", String(days));

    (async () => {
      try {
        const res = await fetch(`/api/governance/trace?${params.toString()}`);
        const json = (await res.json()) as { ok: boolean; data?: TraceGraph; error?: string };
        if (cancelled) return;
        if (!json.ok || !json.data) {
          setError(json.error ?? "Could not load the governance trace.");
          setGraph(null);
        } else {
          setGraph(json.data);
        }
      } catch {
        if (!cancelled) setError("Could not load the governance trace.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, days]);

  const { pos, width, height } = useMemo(() => layout(graph ?? { nodes: [], edges: [] }), [graph]);

  const summary = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    return {
      evidence: nodes.filter((n) => n.type === "evidence").length,
      outputs: nodes.filter((n) => n.type === "agent_output").length,
      checks: nodes.filter((n) => n.type.startsWith("check_")).length,
      decisions: nodes.filter((n) => n.type === "decision").length,
    };
  }, [graph]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-nexus-border bg-nexus-panel p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-nexus-muted">Governance</p>
          <h2 className="mt-1 text-xl font-semibold text-white">How this was produced</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/55">
            Evidence in, specialist agent out, checked, then decided or recommended. Every node here traces to a
            real row Nexus already writes — nothing on this screen is illustrative.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col text-xs text-nexus-muted">
            Room
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-lg border border-white/20 bg-white/[0.03] px-3 py-1.5 text-sm text-white/85"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-nexus-bg">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-nexus-muted">
            Window
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 rounded-lg border border-white/20 bg-white/[0.03] px-3 py-1.5 text-sm text-white/85"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d} className="bg-nexus-bg">
                  Last {d} days
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-nexus-border bg-nexus-panel p-8 text-center text-sm text-nexus-muted">
          Assembling the trace…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 p-5 text-sm text-nexus-danger">
          {error}
        </div>
      ) : !graph || graph.nodes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6">
          <p className="text-sm font-medium text-white/75">No agent activity in this window yet.</p>
          <p className="mt-1 text-sm leading-6 text-white/45">
            Once a specialist agent produces a brief for this room, its evidence, any governance checks, and the
            decisions or recommendations it led to will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Governance trace graph" className="h-[420px] w-full">
              <defs>
                <marker id="trace-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.22)" />
                </marker>
              </defs>
              {graph.edges.map((edge) => {
                const source = pos.get(edge.source);
                const target = pos.get(edge.target);
                if (!source || !target) return null;
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.4"
                    markerEnd="url(#trace-arrow)"
                  />
                );
              })}
              {graph.nodes.map((node) => {
                const point = pos.get(node.id);
                if (!point) return null;
                const style = NODE_STYLE[node.type] ?? { fill: "#94a3b8", stroke: "rgba(148,163,184,0.35)", ring: node.type };
                return (
                  <g key={node.id}>
                    <circle cx={point.x} cy={point.y} r={10} fill={style.fill} fillOpacity="0.88" stroke={style.stroke} strokeWidth="7" />
                    <text x={point.x} y={point.y - 16} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="10" fontFamily="Inter, system-ui, sans-serif">
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.outputs}</p>
                <p className="text-xs text-nexus-muted">agent outputs</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.evidence}</p>
                <p className="text-xs text-nexus-muted">evidence cited</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.checks}</p>
                <p className="text-xs text-nexus-muted">governance checks</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-2xl font-semibold text-white">{summary.decisions}</p>
                <p className="text-xs text-nexus-muted">decisions proposed</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs uppercase tracking-wide text-white/35">Legend</p>
              <ul className="mt-2 space-y-1.5">
                {LEGEND_ORDER.map((type) => (
                  <li key={type} className="flex items-center gap-2 text-xs text-white/65">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: NODE_STYLE[type]?.fill ?? "#94a3b8" }}
                    />
                    {LEGEND_LABEL[type]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
