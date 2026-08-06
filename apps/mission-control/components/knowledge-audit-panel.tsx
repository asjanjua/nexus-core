"use client";

/**
 * Knowledge Audit Panel — collapsible integrity audit section for the
 * Knowledge Workspace. Calls GET /api/knowledge/audit and renders
 * duplicates, contradictions, and stale items with counts and detail.
 *
 * No mutations. Read-only. Deterministic structural audit.
 */

import { useState, useEffect, useCallback } from "react";
import type { AuditReport, DuplicateGroup, ContradictionPair, StaleItem } from "@/lib/knowledge-audit";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgeAuditPanel() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge/audit");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "audit_failed");
      setReport(json.data ?? json);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount so the panel is populated immediately.
  useEffect(() => { run(); }, [run]);

  const totalIssues = report
    ? report.duplicates.length + report.contradictions.length + report.stale.length
    : 0;

  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="panel-title">Knowledge Integrity Audit</p>
          <p className="mt-1 text-sm text-white/55">
            Structural scan for duplicates, contradictions, and stale notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <span className={`text-sm font-medium ${totalIssues > 0 ? "text-amber-300" : "text-green-300"}`}>
              {totalIssues > 0 ? `${totalIssues} issue${totalIssues > 1 ? "s" : ""}` : "Clean"}
            </span>
          )}
          <button className="btn-subtle" disabled={loading} onClick={run}>
            {loading ? "Scanning…" : "Run audit"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-4 py-3 text-sm text-nexus-danger">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-5 text-sm text-white/55">
          Run the audit to scan the Knowledge Workspace for integrity issues.
        </div>
      )}

      {report && expanded && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Duplicates" count={report.duplicates.length} tone={report.duplicates.length > 0 ? "warning" : "good"} />
            <SummaryCard label="Contradictions" count={report.contradictions.length} tone={report.contradictions.length > 0 ? "warning" : "good"} />
            <SummaryCard label="Stale" count={report.stale.length} tone={report.stale.length > 0 ? "warning" : "good"} />
          </div>

          {/* Duplicates */}
          {report.duplicates.length > 0 && (
            <IssueSection title="Duplicates" count={report.duplicates.length}>
              {report.duplicates.map((g, i) => (
                <DuplicateCard key={i} group={g} />
              ))}
            </IssueSection>
          )}

          {/* Contradictions */}
          {report.contradictions.length > 0 && (
            <IssueSection title="Contradictions" count={report.contradictions.length}>
              {report.contradictions.map((p, i) => (
                <ContradictionCard key={i} pair={p} />
              ))}
            </IssueSection>
          )}

          {/* Stale */}
          {report.stale.length > 0 && (
            <IssueSection title="Stale Notes" count={report.stale.length}>
              {report.stale.map((s, i) => (
                <StaleCard key={i} item={s} />
              ))}
            </IssueSection>
          )}

          {/* Meta */}
          <p className="text-[11px] text-white/25">
            Audited {report.totalNotes} notes · {new Date(report.generatedAt).toLocaleString("en-GB")}
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({ label, count, tone }: { label: string; count: number; tone: "good" | "warning" }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className={`text-2xl font-semibold ${tone === "good" ? "text-green-300" : "text-amber-300"}`}>
        {count}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/30">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue section wrapper
// ---------------------------------------------------------------------------

function IssueSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-white/50">
        {title} ({count})
      </h4>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Duplicate card
// ---------------------------------------------------------------------------

function DuplicateCard({ group }: { group: DuplicateGroup }) {
  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="text-xs text-amber-300/70">{group.reason}</p>
      <div className="mt-2 space-y-1">
        {group.notes.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded border border-white/10 bg-white/[0.02] px-3 py-1.5">
            <span className="text-sm text-white/80">{n.title}</span>
            <span className="text-[10px] text-white/30">
              {n.evidenceRefs.length} refs · {n.tags.length} tags
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contradiction card
// ---------------------------------------------------------------------------

function ContradictionCard({ pair }: { pair: ContradictionPair }) {
  return (
    <div className="rounded-lg border border-nexus-danger/20 bg-nexus-danger/5 p-3">
      <p className="text-xs text-nexus-danger/70">{pair.reason}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5">
          <p className="text-xs font-medium text-white">{pair.noteA.title}</p>
          <p className="mt-0.5 text-[10px] text-white/30">{pair.noteA.tags.join(", ")}</p>
        </div>
        <div className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5">
          <p className="text-xs font-medium text-white">{pair.noteB.title}</p>
          <p className="mt-0.5 text-[10px] text-white/30">{pair.noteB.tags.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stale card
// ---------------------------------------------------------------------------

function StaleCard({ item }: { item: StaleItem }) {
  const daysSince = item.note.updatedAt
    ? Math.floor((Date.now() - new Date(item.note.updatedAt).getTime()) / 86_400_000)
    : null;

  return (
    <div className="flex items-center justify-between rounded border border-white/10 bg-white/[0.02] px-3 py-2">
      <div>
        <span className="text-sm text-white/80">{item.note.title}</span>
        <span className="ml-2 text-xs text-white/30">{item.reason}</span>
      </div>
      {daysSince != null && (
        <span className="text-[10px] text-white/25">{daysSince}d ago</span>
      )}
    </div>
  );
}
