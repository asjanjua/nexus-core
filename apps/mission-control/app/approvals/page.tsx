"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceItem = {
  id: string;
  sourcePath: string;
  sourceType: string;
  ingestionStatus: string;
  extractionConfidence: number;
  sensitivity: string;
  freshnessHours: number;
  ingestedAt: string;
  workspaceId: string;
};

type Decision = "approved" | "rejected";

type ItemState =
  | { status: "idle" }
  | { status: "deciding" }
  | { status: "done"; decision: Decision };

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const labelColor = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">Confidence</span>
        <span className={labelColor}>{label} · {pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sensitivity badge
// ---------------------------------------------------------------------------

function SensitivityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    public: "border-green-500/40 bg-green-500/10 text-green-300",
    internal: "border-blue-400/40 bg-blue-400/10 text-blue-300",
    confidential: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    restricted: "border-red-400/40 bg-red-400/10 text-red-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles[value] ?? styles.internal}`}>
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single evidence card
// ---------------------------------------------------------------------------

function EvidenceCard({
  item,
  state,
  onDecide,
}: {
  item: EvidenceItem;
  state: ItemState;
  onDecide: (id: string, decision: Decision) => void;
}) {
  const filename = item.sourcePath.split("/").pop() ?? item.sourcePath;
  const ext = filename.split(".").pop()?.toUpperCase() ?? "FILE";
  const age =
    item.freshnessHours < 24
      ? `${item.freshnessHours}h ago`
      : `${Math.round(item.freshnessHours / 24)}d ago`;

  const isDone = state.status === "done";
  const isDeciding = state.status === "deciding";

  return (
    <div
      className={[
        "rounded-xl border p-5 transition-all",
        isDone
          ? state.decision === "approved"
            ? "border-green-500/20 bg-green-500/5 opacity-60"
            : "border-red-400/20 bg-red-400/5 opacity-60"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xs font-bold text-white/50">
          {ext}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{filename}</p>
          <p className="text-xs text-white/40 font-mono truncate">{item.id}</p>
        </div>
        {isDone ? (
          <span
            className={[
              "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              state.decision === "approved"
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-red-400/40 bg-red-400/10 text-red-300",
            ].join(" ")}
          >
            {state.decision === "approved" ? "✓ Approved" : "✕ Rejected"}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Pending review
          </span>
        )}
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <ConfidenceBar value={item.extractionConfidence} />
      </div>

      {/* Metadata row */}
      <div className="mb-4 flex flex-wrap gap-3 items-center text-xs text-white/40">
        <SensitivityBadge value={item.sensitivity} />
        <span>Source: {item.sourceType}</span>
        <span>Ingested: {age}</span>
      </div>

      {/* Why this is in the queue */}
      {!isDone && (
        <div className="mb-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
          Extraction confidence is between 35% and 75%. This record requires human sign-off before
          entering the LLM synthesis pipeline. Approving will allow it to generate recommendations.
          Rejecting will quarantine it and exclude it from all intelligence outputs.
        </div>
      )}

      {/* Action buttons */}
      {!isDone && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDecide(item.id, "approved")}
            disabled={isDeciding}
            className="rounded-lg bg-nexus-accent px-4 py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {isDeciding ? "Processing..." : "Approve →"}
          </button>
          <button
            onClick={() => onDecide(item.id, "rejected")}
            disabled={isDeciding}
            className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-2xl text-green-400">
        ✓
      </div>
      <p className="text-sm font-medium text-white/80">Queue is clear</p>
      <p className="mt-1 text-xs text-white/40">
        All ingested evidence has been reviewed or auto-approved. No pending decisions.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ApprovalsPage() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evidence?status=pending_approval");
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error ?? "fetch_failed");
      const fetched: EvidenceItem[] = payload.data.items ?? [];
      setItems(fetched);
      setItemStates(Object.fromEntries(fetched.map((i) => [i.id, { status: "idle" }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function decide(id: string, decision: Decision) {
    setItemStates((prev) => ({ ...prev, [id]: { status: "deciding" } }));
    try {
      const res = await fetch(`/api/evidence/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error ?? "review_failed");
      setItemStates((prev) => ({ ...prev, [id]: { status: "done", decision } }));
    } catch {
      // Revert to idle on failure so the user can retry
      setItemStates((prev) => ({ ...prev, [id]: { status: "idle" } }));
    }
  }

  async function approveAll() {
    setBulkProcessing(true);
    const pending = items.filter((i) => itemStates[i.id]?.status === "idle");
    await Promise.all(pending.map((i) => decide(i.id, "approved")));
    setBulkProcessing(false);
  }

  const pendingCount = items.filter((i) => itemStates[i.id]?.status === "idle").length;
  const doneCount = items.filter((i) => itemStates[i.id]?.status === "done").length;

  return (
    <div className="w-full space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Evidence Approval Queue</h1>
          <p className="mt-1 text-sm text-white/50">
            Records with moderate extraction confidence require human sign-off before entering LLM synthesis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={approveAll}
              disabled={bulkProcessing}
              className="btn-subtle text-sm"
            >
              {bulkProcessing ? "Approving..." : `Approve all (${pendingCount})`}
            </button>
          )}
          <button
            onClick={fetchPending}
            disabled={loading}
            className="btn-subtle text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
          <span className="text-white/50">
            Total: <span className="text-white font-medium">{items.length}</span>
          </span>
          <span className="text-amber-300/80">
            Pending: <span className="font-medium">{pendingCount}</span>
          </span>
          {doneCount > 0 && (
            <span className="text-white/50">
              Reviewed this session: <span className="font-medium">{doneCount}</span>
            </span>
          )}
        </div>
      )}

      {/* Policy reminder */}
      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50 space-y-1">
        <p className="font-medium text-white/70">Approval policy</p>
        <p>
          Records above 75% extraction confidence are auto-approved.
          Records below 35% are quarantined automatically.
          Items in this queue scored 35–75% and need a human decision.
        </p>
      </div>

      {/* Content */}
      {loading && (
        <div className="py-12 text-center text-sm text-white/40">Loading approval queue...</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300/40 bg-red-300/10 px-4 py-3 text-sm text-red-200">
          Failed to load queue: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && <EmptyState />}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              state={itemStates[item.id] ?? { status: "idle" }}
              onDecide={decide}
            />
          ))}
        </div>
      )}
    </div>
  );
}
