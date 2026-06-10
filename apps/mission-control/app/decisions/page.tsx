"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types (mirroring contracts — kept local so this file is self-contained)
// ---------------------------------------------------------------------------

type DecisionStatus = "open" | "decided" | "superseded";
type DecisionPriority = "low" | "medium" | "high" | "critical";
type ActionStatus = "open" | "done" | "deferred" | "cancelled";

type Decision = {
  id: string;
  title: string;
  owner: string;
  rationale: string;
  status: DecisionStatus;
  priority: DecisionPriority;
  sourceOutputId?: string | null;
  deadline?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Action = {
  id: string;
  decisionId: string;
  actionText: string;
  owner: string;
  dueDate?: string | null;
  isBlocker: boolean;
  status: ActionStatus;
  completedAt?: string | null;
  createdAt: string;
};

type ProposedAction = {
  actionText: string;
  owner: string;
  dueDate?: string | null;
  isBlocker: boolean;
};

type ProposedDecision = {
  title: string;
  owner: string;
  rationale: string;
  priority: DecisionPriority;
  sourceOutputId?: string | null;
  evidenceRefs: string[];
  actions: ProposedAction[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<DecisionPriority, string> = {
  critical: "text-red-400 border-red-400/40 bg-red-400/10",
  high:     "text-orange-400 border-orange-400/40 bg-orange-400/10",
  medium:   "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  low:      "text-white/40 border-white/10 bg-white/5"
};

const STATUS_COLORS: Record<DecisionStatus, string> = {
  open:       "text-sky-400",
  decided:    "text-emerald-400",
  superseded: "text-white/30"
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ---------------------------------------------------------------------------
// New Decision form
// ---------------------------------------------------------------------------

function NewDecisionForm({ onCreated }: { onCreated: (d: Decision) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", owner: "", rationale: "", priority: "medium" as DecisionPriority,
    deadline: "", status: "open" as DecisionStatus
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, deadline: form.deadline || undefined })
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "create_failed");
      onCreated(j.data.decision);
      setForm({ title: "", owner: "", rationale: "", priority: "medium", deadline: "", status: "open" });
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create decision");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary text-sm">
      + New Decision
    </button>
  );

  return (
    <form onSubmit={submit} className="panel space-y-4 border-sky-400/20">
      <p className="text-sm font-semibold text-white">New Decision</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Decision title</label>
          <input className="input" required value={form.title}
            placeholder="What needs to be decided?"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Owner</label>
          <input className="input" required value={form.owner}
            placeholder="Who is accountable?"
            onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as DecisionPriority }))}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as DecisionStatus }))}>
            <option value="open">Open</option>
            <option value="decided">Decided</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input className="input" type="date" value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Rationale</label>
          <textarea className="input min-h-[80px]" required value={form.rationale}
            placeholder="What context supports this decision?"
            onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving..." : "Create Decision"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// New Action form (inline under a decision)
// ---------------------------------------------------------------------------

function NewActionForm({ decisionId, onCreated }: { decisionId: string; onCreated: (a: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    actionText: "", owner: "", dueDate: "", isBlocker: false
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisionId, ...form, dueDate: form.dueDate || undefined })
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "create_failed");
      onCreated(j.data.action);
      setForm({ actionText: "", owner: "", dueDate: "", isBlocker: false });
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create action");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-sky-400 hover:text-sky-300">
      + Add action
    </button>
  );

  return (
    <form onSubmit={submit} className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
      <input className="input text-sm" required placeholder="What needs to happen?"
        value={form.actionText}
        onChange={e => setForm(f => ({ ...f, actionText: e.target.value }))} />
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1 text-sm" required placeholder="Owner"
          value={form.owner}
          onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        <input className="input flex-1 text-sm" type="date"
          value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        <label className="flex items-center gap-1.5 text-xs text-white/60">
          <input type="checkbox" checked={form.isBlocker}
            onChange={e => setForm(f => ({ ...f, isBlocker: e.target.checked }))} />
          Blocker
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? "Saving..." : "Add"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Agent-output proposal panel
// ---------------------------------------------------------------------------

function ProposalPanel({
  proposals,
  createdKeys,
  acceptingKey,
  onAccept
}: {
  proposals: ProposedDecision[];
  createdKeys: Set<string>;
  acceptingKey: string | null;
  onAccept: (proposal: ProposedDecision, key: string) => void;
}) {
  if (!proposals.length) return null;

  return (
    <section className="panel space-y-4 border-sky-400/20">
      <div>
        <p className="text-sm font-semibold text-white">AI-proposed decisions</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          These are drafts extracted from recent specialist agent outputs. Review before creating records.
        </p>
      </div>
      <div className="space-y-3">
        {proposals.map((proposal, index) => {
          const key = `${proposal.sourceOutputId ?? "manual"}:${proposal.title}:${index}`;
          const created = createdKeys.has(key);
          return (
            <article key={key} className={`rounded-xl border border-white/10 bg-black/20 p-4 ${created ? "opacity-55" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[proposal.priority]}`}>
                      {proposal.priority}
                    </span>
                    {proposal.sourceOutputId && (
                      <span className="font-mono text-xs text-white/30">
                        output {proposal.sourceOutputId.slice(0, 12)}
                      </span>
                    )}
                    {proposal.evidenceRefs.length > 0 && (
                      <span className="text-xs text-white/35">
                        {proposal.evidenceRefs.length} source{proposal.evidenceRefs.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-white">{proposal.title}</h3>
                  <p className="mt-1 text-xs text-white/45">Owner: {proposal.owner}</p>
                </div>
                <button
                  onClick={() => onAccept(proposal, key)}
                  disabled={created || acceptingKey === key}
                  className="btn-primary shrink-0 text-xs"
                >
                  {created ? "Created" : acceptingKey === key ? "Creating..." : "Create decision"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/65">{proposal.rationale}</p>
              {proposal.actions.length > 0 && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-2 text-xs font-medium text-white/45">
                    Proposed actions · {proposal.actions.length}
                  </p>
                  <ul className="space-y-1.5">
                    {proposal.actions.map((action, actionIndex) => (
                      <li key={`${key}:action:${actionIndex}`} className="text-xs leading-5 text-white/60">
                        {action.isBlocker && <span className="mr-1 rounded bg-red-500/20 px-1 py-0.5 text-red-300">BLOCKER</span>}
                        {action.actionText}
                        <span className="ml-1 text-white/30">— {action.owner}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Action row
// ---------------------------------------------------------------------------

function ActionRow({ action, onUpdate }: { action: Action; onUpdate: (a: Action) => void }) {
  const [saving, setSaving] = useState(false);

  async function toggleDone() {
    setSaving(true);
    const newStatus: ActionStatus = action.status === "done" ? "open" : "done";
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const j = await res.json();
      if (j.ok) onUpdate(j.data.action);
    } finally { setSaving(false); }
  }

  const overdue = action.status === "open" && isOverdue(action.dueDate);

  return (
    <div className={`flex items-start gap-3 rounded-lg p-2 transition-colors ${
      action.status === "done" ? "opacity-50" : "hover:bg-white/[0.02]"
    }`}>
      <button
        onClick={toggleDone}
        disabled={saving}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
          action.status === "done"
            ? "border-emerald-400 bg-emerald-400"
            : "border-white/30 hover:border-white/60"
        }`}
      >
        {action.status === "done" && (
          <svg className="h-4 w-4 text-black" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${action.status === "done" ? "line-through text-white/40" : "text-white/90"}`}>
          {action.isBlocker && <span className="mr-1.5 rounded bg-red-500/20 px-1 py-0.5 text-xs text-red-400">BLOCKER</span>}
          {action.actionText}
        </p>
        <p className="mt-0.5 text-xs text-white/40">
          {action.owner}
          {action.dueDate && (
            <span className={`ml-2 ${overdue ? "text-red-400 font-medium" : "text-white/40"}`}>
              {overdue ? "Overdue · " : "Due · "}{fmtDate(action.dueDate)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision card
// ---------------------------------------------------------------------------

function DecisionCard({
  decision,
  actions,
  onDecisionUpdate,
  onActionCreated,
  onActionUpdate
}: {
  decision: Decision;
  actions: Action[];
  onDecisionUpdate: (d: Decision) => void;
  onActionCreated: (a: Action) => void;
  onActionUpdate: (a: Action) => void;
}) {
  const [saving, setSaving] = useState(false);
  const decisionActions = actions.filter(a => a.decisionId === decision.id);
  const openCount = decisionActions.filter(a => a.status === "open").length;
  const blockerCount = decisionActions.filter(a => a.isBlocker && a.status === "open").length;

  async function markDecided() {
    setSaving(true);
    try {
      const res = await fetch(`/api/decisions/${decision.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "decided" })
      });
      const j = await res.json();
      if (j.ok) onDecisionUpdate(j.data.decision);
    } finally { setSaving(false); }
  }

  const overdue = decision.status === "open" && isOverdue(decision.deadline);

  return (
    <article className="panel space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[decision.priority]}`}>
              {decision.priority}
            </span>
            <span className={`text-xs font-medium ${STATUS_COLORS[decision.status]}`}>
              {decision.status}
            </span>
            {blockerCount > 0 && (
              <span className="text-xs text-red-400">{blockerCount} blocker{blockerCount > 1 ? "s" : ""}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug">{decision.title}</h3>
          <p className="mt-0.5 text-xs text-white/50">
            Owner: {decision.owner}
            {decision.deadline && (
              <span className={`ml-3 ${overdue ? "text-red-400 font-medium" : ""}`}>
                {overdue ? "Overdue · " : "Deadline · "}{fmtDate(decision.deadline)}
              </span>
            )}
            {decision.decidedAt && (
              <span className="ml-3 text-emerald-400/70">Decided {fmtDate(decision.decidedAt)}</span>
            )}
          </p>
        </div>
        {decision.status === "open" && (
          <button
            onClick={markDecided}
            disabled={saving}
            className="btn-secondary text-xs shrink-0"
          >
            {saving ? "Saving..." : "Mark Decided"}
          </button>
        )}
      </div>

      {/* Rationale */}
      <p className="text-sm text-white/65 leading-relaxed">{decision.rationale}</p>

      {/* Actions */}
      {decisionActions.length > 0 && (
        <div className="space-y-0.5 border-t border-white/8 pt-3">
          <p className="mb-2 text-xs font-medium text-white/50">
            Actions · {openCount} open{decisionActions.length > openCount ? ` · ${decisionActions.length - openCount} done` : ""}
          </p>
          {decisionActions.map(a => (
            <ActionRow key={a.id} action={a} onUpdate={onActionUpdate} />
          ))}
        </div>
      )}

      <div className="border-t border-white/8 pt-2">
        <NewActionForm decisionId={decision.id} onCreated={onActionCreated} />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [proposals, setProposals] = useState<ProposedDecision[]>([]);
  const [createdProposalKeys, setCreatedProposalKeys] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [acceptingProposal, setAcceptingProposal] = useState<string | null>(null);
  const [proposalMessage, setProposalMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DecisionStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dresp, aresp] = await Promise.all([
        fetch("/api/decisions").then(r => r.json()),
        fetch("/api/actions").then(r => r.json())
      ]);
      if (dresp.ok) setDecisions(dresp.data.decisions ?? []);
      if (aresp.ok) setActions(aresp.data.actions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDecisionCreated(d: Decision) {
    setDecisions(prev => [d, ...prev]);
  }

  function handleDecisionUpdate(d: Decision) {
    setDecisions(prev => prev.map(x => x.id === d.id ? d : x));
  }

  function handleActionCreated(a: Action) {
    setActions(prev => [a, ...prev]);
  }

  function handleActionUpdate(a: Action) {
    setActions(prev => prev.map(x => x.id === a.id ? a : x));
  }

  async function extractProposals() {
    setExtracting(true);
    setProposalMessage(null);
    try {
      const res = await fetch("/api/decisions/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 7, limit: 12 })
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "extract_failed");
      const next = (j.data.proposals ?? []) as ProposedDecision[];
      setProposals(next);
      setProposalMessage(
        next.length
          ? `${next.length} proposed decision${next.length === 1 ? "" : "s"} found.`
          : "No strong decision candidates found in recent agent outputs. Generate a dashboard brief first, then try again."
      );
    } catch (err) {
      setProposalMessage(err instanceof Error ? err.message : "Failed to extract proposals");
    } finally {
      setExtracting(false);
    }
  }

  async function acceptProposal(proposal: ProposedDecision, key: string) {
    setAcceptingProposal(key);
    try {
      const decisionRes = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: proposal.title,
          owner: proposal.owner,
          rationale: proposal.rationale,
          priority: proposal.priority,
          sourceOutputId: proposal.sourceOutputId ?? undefined,
          status: "open"
        })
      });
      const decisionPayload = await decisionRes.json();
      if (!decisionPayload.ok) throw new Error(decisionPayload.error ?? "decision_create_failed");
      const decision = decisionPayload.data.decision as Decision;
      setDecisions(prev => [decision, ...prev]);

      const createdActions = await Promise.all(
        proposal.actions.map(async (action) => {
          const actionRes = await fetch("/api/actions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              decisionId: decision.id,
              actionText: action.actionText,
              owner: action.owner,
              dueDate: action.dueDate ?? undefined,
              isBlocker: action.isBlocker
            })
          });
          const actionPayload = await actionRes.json();
          if (!actionPayload.ok) throw new Error(actionPayload.error ?? "action_create_failed");
          return actionPayload.data.action as Action;
        })
      );
      setActions(prev => [...createdActions, ...prev]);
      setCreatedProposalKeys(prev => new Set(prev).add(key));
      setProposalMessage("Decision created. You can edit owner, priority, and actions from the list below.");
    } catch (err) {
      setProposalMessage(err instanceof Error ? err.message : "Failed to create proposed decision");
    } finally {
      setAcceptingProposal(null);
    }
  }

  const filtered = filter === "all"
    ? decisions
    : decisions.filter(d => d.status === filter);

  const openCount      = decisions.filter(d => d.status === "open").length;
  const decidedCount   = decisions.filter(d => d.status === "decided").length;
  const openActions    = actions.filter(a => a.status === "open").length;
  const blockerActions = actions.filter(a => a.isBlocker && a.status === "open").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Decision & Action Twin</h1>
          <p className="mt-1 text-sm text-white/50">
            Track what was decided, who owns it, and what actions are flowing from each decision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={extractProposals} disabled={extracting} className="btn-secondary text-sm">
            {extracting ? "Scanning outputs..." : "Propose from agent outputs"}
          </button>
          <NewDecisionForm onCreated={handleDecisionCreated} />
        </div>
      </div>

      {proposalMessage && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
          {proposalMessage}
        </div>
      )}

      <ProposalPanel
        proposals={proposals}
        createdKeys={createdProposalKeys}
        acceptingKey={acceptingProposal}
        onAccept={acceptProposal}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open decisions", value: openCount, color: "text-sky-400" },
          { label: "Decided",        value: decidedCount, color: "text-emerald-400" },
          { label: "Open actions",   value: openActions, color: "text-white" },
          { label: "Blockers",       value: blockerActions, color: blockerActions > 0 ? "text-red-400" : "text-white/40" }
        ].map(s => (
          <div key={s.label} className="panel py-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-white/45">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0">
        {(["all", "open", "decided", "superseded"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "border-b-2 border-sky-400 text-sky-400"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Decision list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="panel animate-pulse h-32 bg-white/[0.02]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel py-12 text-center">
          <p className="text-sm text-white/40">
            {filter === "all"
              ? "No decisions yet. Create one above or generate a brief from the dashboard — decisions flow from agent outputs."
              : `No ${filter} decisions.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(d => (
            <DecisionCard
              key={d.id}
              decision={d}
              actions={actions}
              onDecisionUpdate={handleDecisionUpdate}
              onActionCreated={handleActionCreated}
              onActionUpdate={handleActionUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
