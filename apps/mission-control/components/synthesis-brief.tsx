"use client";

/**
 * ExecutiveSynthesisBrief
 *
 * Primary panel on the dashboard. Shows role-specific answered questions
 * backed by specialist agent briefs and evidence. Agent cards appear
 * below this as collapsible drill-down.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExecutiveSynthesis } from "@/lib/contracts";
import { ConfidenceBadge } from "@/components/ui/trust-drawer-trigger";

// Confidence badge moved to components/ui/trust-drawer-trigger.tsx — it now
// opens the Trust Drawer on click and uses locked design tokens instead of
// the raw amber-300/red-300 Tailwind colors this file used to hardcode.

// ---------------------------------------------------------------------------
// Single answered question card
// ---------------------------------------------------------------------------

function QuestionCard({
  index,
  question,
  answer,
  confidence,
  evidenceCount,
  sources,
  entities,
}: {
  index: number;
  question: string;
  answer: string;
  confidence: number;
  evidenceCount: number;
  sources: ExecutiveSynthesis["questions"][number]["sources"];
  entities: ExecutiveSynthesis["questions"][number]["entities"];
}) {
  const isInsufficient =
    answer.startsWith("Insufficient evidence") ||
    answer.startsWith("NexusAI blocked") ||
    answer.startsWith("Synthesis unavailable");

  return (
    <div className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nexus-accent/15 text-xs font-semibold text-nexus-accent">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/40 mb-1">
            {question}
          </p>
          <p
            className={`text-sm leading-6 ${
              isInsufficient ? "text-white/35 italic" : "text-white/85"
            }`}
          >
            {answer}
          </p>
          {!isInsufficient && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge
                  confidence={confidence}
                  title={question}
                  sources={sources.map((s) => ({
                    id: s.id,
                    label: s.label,
                    sourceType: s.sourceType,
                    department: s.department,
                    confidence: s.confidence,
                  }))}
                  entities={entities.map((e) => ({ id: e.id, name: e.name, type: e.type, confidence: e.confidence }))}
                />
                {evidenceCount > 0 && (
                  <span className="badge badge-muted">{evidenceCount} evidence sources</span>
                )}
              </div>

              {sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((source) => (
                    <Link
                      key={source.id}
                      href={`/evidence/${source.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/55 hover:border-nexus-accent/50 hover:text-white"
                      title={`${source.sourceType}${source.department ? ` · ${source.department}` : ""}`}
                    >
                      {source.label}
                    </Link>
                  ))}
                </div>
              )}

              {entities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entities.map((entity) => (
                    <span
                      key={entity.id}
                      className="rounded-full border border-nexus-accent/15 bg-nexus-accent/5 px-2 py-0.5 text-xs text-nexus-accent/75"
                      title={`${entity.type} · ${Math.round(entity.confidence * 100)}% confidence`}
                    >
                      {entity.name}
                    </span>
                  ))}
                </div>
              )}

              {!isInsufficient && (
                <div className="mt-3">
                  <Link
                    href={`/decisions?prefill=${encodeURIComponent(question.slice(0, 80))}&rationale=${encodeURIComponent(answer.slice(0, 500))}&evidenceRefs=${encodeURIComponent(sources.map((s) => s.id).join(","))}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-nexus-accent/30 bg-nexus-accent/10 px-3 py-1 text-xs text-nexus-accent hover:bg-nexus-accent/20 transition-colors"
                  >
                    <span>+</span> Create Decision
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExecutiveSynthesisBrief({
  synthesis,
  roleLabel,
  department,
}: {
  synthesis: ExecutiveSynthesis;
  roleLabel: string;
  department?: string;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const answeredCount = synthesis.questions.filter(
    (q) =>
      !q.answer.startsWith("Insufficient evidence") &&
      !q.answer.startsWith("NexusAI blocked") &&
      !q.answer.startsWith("Synthesis unavailable")
  ).length;

  return (
    <section className="panel space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-nexus-accent/70">
            Executive Brief
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{roleLabel} Intelligence Brief</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
            Synthesised from {synthesis.agentCardCount} specialist agent brief
            {synthesis.agentCardCount !== 1 ? "s" : ""} and {synthesis.totalEvidenceRefs.length} evidence
            source{synthesis.totalEvidenceRefs.length !== 1 ? "s" : ""}. Updated{" "}
            {new Date(synthesis.generatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge
            confidence={synthesis.overallConfidence}
            title={`${roleLabel} Intelligence Brief — overall confidence`}
            sources={synthesis.totalEvidenceRefs.map((id) => ({ id }))}
          />
          <span className="badge badge-muted">
            {answeredCount}/{synthesis.questions.length} answered
          </span>
          <span className="badge badge-green">Human-approved actions only</span>
          <button
            type="button"
            className="badge badge-muted hover:border-nexus-accent/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              const params = department ? `?department=${encodeURIComponent(department)}` : "";
              try {
                await fetch(`/api/synthesis/${encodeURIComponent(synthesis.role)}${params}`, {
                  method: "POST",
                });
                router.refresh();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh brief"}
          </button>
        </div>
      </div>

      {/* Question answers */}
      <div className="space-y-4">
        {synthesis.questions.map((q, i) => (
          <QuestionCard
            key={i}
            index={i + 1}
            question={q.question}
            answer={q.answer}
            confidence={q.confidence}
            evidenceCount={q.evidenceRefs.length}
            sources={q.sources}
            entities={q.entities}
          />
        ))}
      </div>

      {/* Empty state */}
      {synthesis.questions.length === 0 && (
        <p className="py-6 text-center text-sm text-white/35">
          No questions configured for this role. Ingest documents to enable synthesis.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

export function SynthesisBriefSkeleton({ questionCount = 5 }: { questionCount?: number }) {
  return (
    <section className="panel space-y-5">
      <div className="space-y-1">
        <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
        <div className="h-6 w-64 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-96 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: questionCount }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0">
            <div className="h-5 w-5 shrink-0 rounded-full bg-white/10 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-48 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Collapsible agent detail wrapper
// ---------------------------------------------------------------------------

export function AgentDetailSection({
  children,
  cardCount,
}: {
  children: React.ReactNode;
  cardCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/3 px-4 py-3 text-sm text-white/60 hover:bg-white/6 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-white/80">
          Specialist Agent Detail
          <span className="ml-2 text-white/40">({cardCount} agent{cardCount !== 1 ? "s" : ""})</span>
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}
