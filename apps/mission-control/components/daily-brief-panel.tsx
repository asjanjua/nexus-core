"use client";

/**
 * Daily Brief Panel — proactive operating memory for the Knowledge Workspace.
 * Shows notes created/updated in the last 24h, pending decisions, untagged
 * notes needing classification, and stale items.
 *
 * Fetches from GET /api/knowledge/daily-brief. Read-only.
 */

import { useState, useEffect, useCallback } from "react";
import type { DailyBrief, RecentNote } from "@/lib/daily-brief";

export function DailyBriefPanel() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge/daily-brief");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "brief_failed");
      setBrief(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily brief");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  const issues = brief
    ? brief.untagged.length + brief.stale.length
    : 0;

  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="panel-title">Daily Brief</p>
          <p className="mt-1 text-sm text-white/55">
            Last 24 hours of Knowledge Workspace activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {brief && (
            <span className={`text-sm font-medium ${issues > 0 ? "text-amber-300" : "text-green-300"}`}>
              {brief.recentNotes.length} update{brief.recentNotes.length !== 1 ? "s" : ""}
              {issues > 0 && ` · ${issues} issue${issues > 1 ? "s" : ""}`}
            </span>
          )}
          <button className="btn-subtle" disabled={loading} onClick={fetchBrief}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-4 py-3 text-sm text-nexus-danger">
          {error}
        </div>
      )}

      {!brief && !loading && !error && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
          No brief available. Add notes to the Knowledge Workspace to generate your first daily brief.
        </div>
      )}

      {brief && brief.recentNotes.length === 0 && !loading && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
          No activity in the last 24 hours. The next brief will appear when notes are created or updated.
        </div>
      )}

      {brief && (
        <div className="space-y-4">
          {/* Recent activity */}
          {brief.recentNotes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-white/50">
                Recent Activity ({brief.recentNotes.length})
              </h4>
              <div className="mt-2 space-y-1">
                {brief.recentNotes.map((n) => (
                  <RecentNoteCard key={n.id} note={n} />
                ))}
              </div>
            </div>
          )}

          {/* Pending decisions section */}
          {brief.pendingDecisions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-amber-400/60">
                Pending Decisions ({brief.pendingDecisions.length})
              </h4>
              <div className="mt-2 space-y-1">
                {brief.pendingDecisions.slice(0, 5).map((n) => (
                  <div key={n.id} className="rounded border border-amber-400/15 bg-amber-400/[0.03] px-3 py-1.5">
                    <span className="text-xs text-white/70">{n.title}</span>
                    <span className="ml-2 text-[10px] text-white/30">
                      {n.decisionRefs.length} decision{n.decisionRefs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
                {brief.pendingDecisions.length > 5 && (
                  <p className="text-[10px] text-white/20 pl-1">
                    +{brief.pendingDecisions.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Needs attention: untagged + stale */}
          {issues > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-amber-400/60">
                Needs Attention ({issues})
              </h4>
              <div className="mt-2 space-y-1">
                {brief.untagged.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-white/60">{n.title}</span>
                    <span className="text-[10px] text-amber-400/50">untagged</span>
                  </div>
                ))}
                {brief.stale.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-white/60">{n.title}</span>
                    <span className="text-[10px] text-white/25">
                      {Math.floor((Date.now() - new Date(n.updatedAt).getTime()) / 86_400_000)}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tag activity */}
          {brief.tagChanges.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-white/40">Recent Tags</h4>
              <div className="mt-1 flex flex-wrap gap-1">
                {brief.tagChanges.map((tag) => (
                  <span key={tag} className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] text-blue-300">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-white/25">
            {brief.totalNotes} notes · {new Date(brief.generatedAt).toLocaleString("en-GB")}
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recent note card
// ---------------------------------------------------------------------------

function RecentNoteCard({ note }: { note: RecentNote }) {
  const dot = note.change === "new" ? "🆕" : "✏️";
  return (
    <div className="flex items-center justify-between rounded border border-white/10 bg-white/[0.02] px-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs shrink-0">{dot}</span>
        <span className="text-xs text-white/75 truncate">{note.title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {note.evidenceRefs.length > 0 && (
          <span className="text-[10px] text-white/25">{note.evidenceRefs.length} refs</span>
        )}
        <span className="text-[10px] text-white/20">
          {new Date(note.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
