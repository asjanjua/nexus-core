"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExecutiveSynthesis } from "@/lib/contracts";
import { AiPanel, MetaChip, SecondaryLink } from "@/components/ui/nexus-primitives";

type BoardDeltaResult = {
  brief: ExecutiveSynthesis;
  delta: string | null;
  hasPrevious: boolean;
};

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function sourceLabel(source: ExecutiveSynthesis["questions"][number]["sources"][number]) {
  const suffix = source.department ? ` · ${source.department}` : "";
  return `${source.label}${suffix}`;
}

function QuestionCard({
  index,
  question,
}: {
  index: number;
  question: ExecutiveSynthesis["questions"][number];
}) {
  const muted =
    question.answer.startsWith("Insufficient evidence") ||
    question.answer.startsWith("NexusAI blocked") ||
    question.answer.startsWith("Synthesis unavailable");

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nexus-brand/15 text-xs font-semibold text-nexus-brand">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{question.question}</p>
          <p className={`mt-2 text-sm leading-6 ${muted ? "text-white/40 italic" : "text-white/82"}`}>
            {question.answer}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MetaChip label={`confidence ${pct(question.confidence)}`} tone={question.confidence >= 0.7 ? "accent" : "warn"} />
            <MetaChip label={`${question.evidenceRefs.length} evidence refs`} tone="sky" />
            {question.entities.slice(0, 4).map((entity) => (
              <Link
                key={entity.id}
                href={`/entities/${entity.id}`}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/55 hover:border-nexus-brand/40 hover:text-white"
              >
                {entity.name}
              </Link>
            ))}
          </div>
          {question.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {question.sources.map((source) => (
                <Link
                  key={source.id}
                  href={`/evidence/${source.id}`}
                  className="rounded-full border border-nexus-sky/20 bg-nexus-sky/5 px-2 py-0.5 text-xs text-nexus-sky/80 hover:border-nexus-sky/50 hover:text-nexus-sky"
                  title={`${source.sourceType} · ${pct(source.confidence)}`}
                >
                  {sourceLabel(source)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function BoardRoomPanel() {
  const [department, setDepartment] = useState("main-board");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BoardDeltaResult | null>(null);

  async function runDelta() {
    setLoading(true);
    setError(null);
    try {
      const qs = department.trim() ? `?department=${encodeURIComponent(department.trim())}` : "";
      const response = await fetch(`/api/board/delta${qs}`, { method: "POST" });
      const payload = (await response.json()) as ApiEnvelope<BoardDeltaResult>;
      if (!payload.ok) {
        throw new Error(payload.error || "board_delta_failed");
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate board brief.");
    } finally {
      setLoading(false);
    }
  }

  const brief = result?.brief ?? null;
  const answeredCount =
    brief?.questions.filter(
      (question) =>
        !question.answer.startsWith("Insufficient evidence") &&
        !question.answer.startsWith("NexusAI blocked") &&
        !question.answer.startsWith("Synthesis unavailable")
    ).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-nexus-brand/25 bg-[#0b1220] p-5 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] sm:p-6">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nexus-brand/80">
              Quorum · Board Intelligence
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Between-meetings brief for directors
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Quorum compares today&apos;s board-pack synthesis with the last saved brief for the same board
              identifier. Use a stable identifier like <span className="font-mono text-white/80">main-board</span>,
              not a quarter label, so the delta chain stays continuous.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm text-white/70">
            <p className="text-xs uppercase tracking-wide text-white/40">Governance boundary</p>
            <p className="mt-2 max-w-xs leading-6">
              No action is sent, filed, or approved from this screen. Board outputs stay reviewable and human-owned.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <div className="panel space-y-4">
          <div>
            <p className="panel-title">Run Board Delta</p>
            <p className="mt-1 text-sm leading-6 text-white/50">
              Generate a fresh board synthesis and compare it with the prior active brief for the same board.
            </p>
          </div>
          <label>
            <span className="label">Stable board identifier</span>
            <input
              className="input"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="main-board"
            />
          </label>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={runDelta}
            disabled={loading}
          >
            {loading ? "Generating board brief..." : "Generate board delta"}
          </button>
          {error && (
            <p className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-sm text-nexus-danger">
              {error}
            </p>
          )}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/45">
            <p className="font-semibold uppercase tracking-wide text-white/55">What happens</p>
            <p className="mt-1">
              First run creates the baseline. Second and later runs show what materially changed: new risks,
              slipping actions, financial movements, and unsupported claims.
            </p>
          </div>
        </div>

        <div className="panel space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="panel-title">Current Quorum Status</p>
              <p className="mt-1 text-sm text-white/50">
                {brief
                  ? `Generated ${new Date(brief.generatedAt).toLocaleString()}`
                  : "No board brief generated in this session yet."}
              </p>
            </div>
            {brief && (
              <div className="flex flex-wrap gap-2">
                <MetaChip label={`${answeredCount}/${brief.questions.length} answered`} tone="accent" />
                <MetaChip label={`${brief.totalEvidenceRefs.length} evidence refs`} tone="sky" />
                <MetaChip label={`confidence ${pct(brief.overallConfidence)}`} tone={brief.overallConfidence >= 0.7 ? "accent" : "warn"} />
              </div>
            )}
          </div>

          {result ? (
            result.hasPrevious ? (
              <AiPanel>
                <div className="pr-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-nexus-ai/80">
                    Between-meetings delta
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/84">
                    {result.delta ?? "Delta unavailable because the prior brief could not be read."}
                  </p>
                </div>
              </AiPanel>
            ) : (
              <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-4 text-sm leading-6 text-nexus-warn">
                Baseline created for this board identifier. Run Quorum again after the next pack is ingested to see
                the between-meetings delta.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-5 text-sm leading-6 text-white/45">
              Generate the first board brief to populate director questions and establish a comparison baseline.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <SecondaryLink href="/dashboard/board" label="Open board dashboard" />
            <SecondaryLink href="/ingestion" label="Upload board pack" />
            <SecondaryLink href="/decisions" label="Review decisions" />
          </div>
        </div>
      </section>

      {brief && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-nexus-brand/70">Director Q&A</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Questions the board should ask management</h3>
            </div>
            <span className="badge badge-muted">Board id: {department || "untagged"}</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {brief.questions.map((question, index) => (
              <QuestionCard key={`${question.question}-${index}`} index={index + 1} question={question} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
