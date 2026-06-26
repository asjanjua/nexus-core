/**
 * Now / Next strip — locked signature pattern (see nexus-design-system
 * skill). A persistent bar on any running workflow showing the current
 * step, the next gate, its owner, and ETA. Built from real Action records
 * (decisionId, actionText, owner, dueDate, isBlocker, status) — never a
 * synthetic "step" invented for display. Renders nothing if there is no
 * open action, since a decision with no open actions is not a running
 * workflow.
 */

import { MetaChip } from "@/components/ui/nexus-primitives";

export interface NowNextAction {
  id: string;
  actionText: string;
  owner: string;
  dueDate?: string | null;
  isBlocker: boolean;
  status: "open" | "done" | "deferred" | "cancelled";
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

/** Blockers first, then earliest due date, then creation order (array order is assumed createdAt-ordered). */
function rankOpenActions(actions: NowNextAction[]): NowNextAction[] {
  return actions
    .filter((a) => a.status === "open")
    .sort((a, b) => {
      if (a.isBlocker !== b.isBlocker) return a.isBlocker ? -1 : 1;
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    });
}

function StepCard({
  label,
  action,
  tone,
}: {
  label: "Now" | "Next";
  action: NowNextAction;
  tone: "accent" | "sky";
}) {
  const overdue = isOverdue(action.dueDate);
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
      <div className="flex items-center gap-1.5">
        <MetaChip label={label} tone={tone} />
        {action.isBlocker && <MetaChip label="Blocker" tone="danger" />}
      </div>
      <p className="mt-1.5 truncate text-sm text-nexus-text" title={action.actionText}>
        {action.actionText}
      </p>
      <p className="mt-1 text-xs text-nexus-muted">
        {action.owner}
        {action.dueDate && (
          <span className={overdue ? "ml-2 font-medium text-nexus-danger" : "ml-2"}>
            {overdue ? "Overdue · " : "Due · "}{fmtDate(action.dueDate)}
          </span>
        )}
      </p>
    </div>
  );
}

export function NowNextStrip({ actions }: { actions: NowNextAction[] }) {
  const ranked = rankOpenActions(actions);
  if (ranked.length === 0) return null;

  const [now, next] = ranked;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <StepCard label="Now" action={now} tone="accent" />
      {next ? (
        <StepCard label="Next" action={next} tone="sky" />
      ) : (
        <div className="flex-1 min-w-0 rounded-lg border border-dashed border-nexus-border p-3">
          <MetaChip label="Next" tone="sky" />
          <p className="mt-1.5 text-xs text-nexus-muted">No further open action queued yet.</p>
        </div>
      )}
    </div>
  );
}
