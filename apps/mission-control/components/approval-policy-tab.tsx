"use client";

/**
 * Approval Policy Editor — Settings tab for configuring the workspace's
 * approval rules: single reviewer, N-of-M, sequential chain, or role-scoped.
 *
 * Fetches the current policy from GET /api/approval-policy and displays
 * live staffing status. Saves via PUT /api/approval-policy.
 *
 * See docs/APPROVAL_POLICIES_SPEC.md §7.
 */

import { useState, useEffect, useCallback } from "react";
import { APPROVAL_POLICY_MODES, type ApprovalPolicyMode } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Policy {
  mode: ApprovalPolicyMode;
  requiredCount?: number | null;
  requiredRoles?: string[] | null;
  allowBreakGlass?: boolean;
}

interface StaffingSummary {
  policy: Policy;
  isDefault: boolean;
  staffable: boolean;
  seats: Array<{ id: string; clerkUserId: string; email: string; role: string | null; level: number | null }>;
  roleBreakdown: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  workspaceId: string;
}

export function ApprovalPolicyTab({ workspaceId }: Props) {
  const [data, setData] = useState<StaffingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Editable state.
  const [mode, setMode] = useState<ApprovalPolicyMode>("single");
  const [requiredCount, setRequiredCount] = useState<number>(2);
  const [requiredRoles, setRequiredRoles] = useState<string>("");
  const [allowBreakGlass, setAllowBreakGlass] = useState(true);

  // Fetch current policy.
  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approval-policy");
      if (!res.ok) throw new Error("Failed to load policy");
      const json = await res.json();
      const summary: StaffingSummary = json.data ?? json;
      setData(summary);
      setMode(summary.policy.mode ?? "single");
      setRequiredCount(summary.policy.requiredCount ?? 2);
      setRequiredRoles((summary.policy.requiredRoles ?? []).join(", "));
      setAllowBreakGlass(summary.policy.allowBreakGlass !== false);
      setError(null);
    } catch {
      setError("Could not load approval policy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicy(); }, [fetchPolicy]);

  // Save.
  async function save() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      mode,
      allowBreakGlass,
    };
    if (mode === "n_of_m" || mode === "sequential") {
      body.requiredCount = requiredCount;
    }
    if (mode === "role_scoped") {
      body.requiredRoles = requiredRoles.split(",").map((r) => r.trim()).filter(Boolean);
    }

    try {
      const res = await fetch("/api/approval-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }
      setDirty(false);
      await fetchPolicy(); // Refresh with server-computed staffing.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function markDirty(mode: ApprovalPolicyMode) {
    setMode(mode);
    setDirty(true);
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-white/30">Loading approval policy…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-4 py-3 text-sm text-nexus-danger">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Mode selector */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-white">Approval Mode</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {APPROVAL_POLICY_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => markDirty(m)}
              className={[
                "rounded-lg border px-4 py-3 text-left text-sm transition",
                mode === m
                  ? "border-nexus-accent/60 bg-nexus-accent/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80",
              ].join(" ")}
            >
              <div className="font-medium">
                {m === "single" && "Single reviewer"}
                {m === "n_of_m" && "N of M"}
                {m === "sequential" && "Sequential chain"}
                {m === "role_scoped" && "Role-scoped"}
              </div>
              <div className="mt-0.5 text-[10px] text-white/30">
                {m === "single" && "One bound reviewer approves"}
                {m === "n_of_m" && "Any N of M seats must approve"}
                {m === "sequential" && "Approvers in level order"}
                {m === "role_scoped" && "One per required role"}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Mode-specific configuration */}
      {(mode === "n_of_m" || mode === "sequential") && (
        <section className="space-y-2">
          <label className="block">
            <span className="text-xs text-white/60">Required approvals</span>
            <input
              type="number"
              min={2}
              max={10}
              value={requiredCount}
              onChange={(e) => { setRequiredCount(Number(e.target.value)); setDirty(true); }}
              className="mt-1 w-24 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-nexus-accent/50 focus:outline-none"
            />
          </label>
        </section>
      )}

      {mode === "role_scoped" && (
        <section className="space-y-2">
          <label className="block">
            <span className="text-xs text-white/60">Required roles (comma-separated)</span>
            <input
              type="text"
              value={requiredRoles}
              onChange={(e) => { setRequiredRoles(e.target.value); setDirty(true); }}
              placeholder="compliance, sponsor, board"
              className="mt-1 w-full max-w-md rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-nexus-accent/50 focus:outline-none"
            />
          </label>
        </section>
      )}

      {/* Break-glass toggle */}
      <section className="space-y-2">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allowBreakGlass}
            onChange={(e) => { setAllowBreakGlass(e.target.checked); setDirty(true); }}
            className="accent-nexus-accent"
          />
          <span className="text-sm text-white/70">Allow break-glass (admin/bearer override)</span>
        </label>
      </section>

      {/* Save */}
      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="rounded-lg bg-nexus-accent px-5 py-2 text-sm font-medium text-black transition hover:bg-nexus-accent/90 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save policy"}
      </button>

      {/* Staffing summary */}
      {data && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-medium text-white">Staffing Status</h3>
          <div className="mt-2 space-y-1 text-xs text-white/50">
            <p>
              <span className="text-white/30">Policy:</span>{" "}
              {data.isDefault ? "Default (single reviewer)" : data.policy.mode}
            </p>
            <p>
              <span className="text-white/30">Staffable:</span>{" "}
              <span className={data.staffable ? "text-nexus-accent" : "text-nexus-danger"}>
                {data.staffable ? "Yes" : "No"}
              </span>
            </p>
            <p>
              <span className="text-white/30">Accepted seats:</span>{" "}
              {data.seats.length}
            </p>
            {Object.keys(data.roleBreakdown).length > 0 && (
              <p>
                <span className="text-white/30">Roles:</span>{" "}
                {Object.entries(data.roleBreakdown)
                  .map(([role, count]) => `${role} (${count})`)
                  .join(", ")}
              </p>
            )}
            {data.seats.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.seats.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[11px] text-white/40">
                    <span className="text-white/60">{s.email}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {s.role ?? "unassigned"}
                      {s.level != null ? ` L${s.level}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
