"use client";

/**
 * Vantage Coverage arc — the first executable Vantage deep route.
 *
 * The native diligence runner already produces governed coverage, red flags,
 * model tie-outs, and IC memo section drafts. This UI deliberately exposes
 * only the evidence-review facts that move diligence forward. It does not
 * surface the runner's internal recommendation label as an investment call.
 */

import { useState } from "react";
import Link from "next/link";
import { InfoHint, SkeletonLines } from "@/components/ui/nexus-primitives";

type DealType = "fintech_ma" | "generic_ma";

type CoverageRow = {
  itemId: string;
  category: string;
  requirement: string;
  severity: "critical" | "high" | "medium" | "low";
  covered: boolean;
  citations: Array<{ evidenceId: string; sourcePath: string; sourceSpan: string; confidence: number }>;
};

type RedFlag = {
  itemId: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  requirement: string;
  indicator: string;
  reason: "missing_critical_evidence" | "missing_high_evidence";
};

type ReviewResult = {
  coverage: CoverageRow[];
  redFlags: RedFlag[];
  deniedByPassport: number;
  summary: { items: number; covered: number; gaps: number; criticalGaps: number; redFlags: number };
};

const DEAL_TYPES: Array<{ value: DealType; label: string; hint: string }> = [
  {
    value: "fintech_ma",
    label: "Fintech M&A",
    hint: "Uses the fintech acquisition checklist, including regulated activity and safeguarding evidence.",
  },
  {
    value: "generic_ma",
    label: "General M&A",
    hint: "Uses the general transaction checklist across financial, commercial, legal, technology, and people diligence.",
  },
];

function severityTone(severity: CoverageRow["severity"]) {
  if (severity === "critical") return "border-nexus-danger/30 bg-nexus-danger/10 text-nexus-danger";
  if (severity === "high") return "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn";
  return "border-white/10 bg-black/20 text-white/55";
}

export function VantageCoverageReview() {
  const [dealType, setDealType] = useState<DealType>("fintech_ma");
  const [reviewId, setReviewId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = DEAL_TYPES.find((item) => item.value === dealType)!;
  const coveragePercent = result
    ? Math.round((result.summary.covered / Math.max(result.summary.items, 1)) * 100)
    : null;

  async function runReview() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/native-skills/vantage-diligence-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reviewId: reviewId.trim() || `coverage-${new Date().toISOString().slice(0, 10)}`,
          dealType,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "review_failed");
      setResult(payload.data as ReviewResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "review_failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="panel border-[#D9834A]/30">
        <p className="panel-title text-[#F1B084]">Choose the review scope</p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          This review reads only processed, governed evidence in this workspace. It records an audit event,
          but it does not save a deal decision or send anything to an investment committee.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <label className="label" htmlFor="dealType">Deal checklist</label>
            <select
              id="dealType"
              className="input"
              value={dealType}
              onChange={(event) => setDealType(event.target.value as DealType)}
            >
              {DEAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <InfoHint text={selected.hint} />
          </div>
          <div>
            <label className="label" htmlFor="reviewId">Review reference</label>
            <input
              id="reviewId"
              className="input"
              value={reviewId}
              onChange={(event) => setReviewId(event.target.value.slice(0, 80))}
              placeholder="e.g. GCC-EMI-2026-01"
            />
            <InfoHint text="Optional. Use a reference the deal team recognizes; otherwise Vantage uses today's date." />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary disabled:opacity-40" onClick={runReview} disabled={running}>
            {running ? "Reviewing governed evidence..." : "Run coverage review"}
          </button>
          <Link href="/ingestion" className="btn-subtle text-sm" prefetch={false}>Add or review evidence</Link>
          <span className="text-xs text-white/40">The result separates missing evidence from a human judgment of risk.</span>
        </div>
      </section>

      {running && <section className="panel"><SkeletonLines lines={6} /></section>}

      {error && <p className="panel text-sm text-nexus-danger">The coverage review could not run: {error}</p>}

      {!running && !result && (
        <section className="panel">
          <p className="panel-title">What the review will show</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs font-semibold text-white">Coverage</p><p className="mt-1 text-xs leading-5 text-white/50">Which checklist requirements have governed citations.</p></div>
            <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-3"><p className="text-xs font-semibold text-nexus-warn">Evidence gaps</p><p className="mt-1 text-xs leading-5 text-white/50">Critical and high items needing a request or follow-up.</p></div>
            <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 p-3"><p className="text-xs font-semibold text-nexus-danger">Human decision boundary</p><p className="mt-1 text-xs leading-5 text-white/50">The IC or authorized buyer still judges materiality and decides.</p></div>
          </div>
        </section>
      )}

      {result && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="panel"><p className="text-xs uppercase tracking-wide text-white/40">Checklist coverage</p><p className="mt-2 text-3xl font-bold text-[#F1B084]">{coveragePercent}%</p><p className="mt-1 text-xs text-white/40">{result.summary.covered} of {result.summary.items} requirements cited</p></div>
            <div className="panel"><p className="text-xs uppercase tracking-wide text-white/40">Evidence gaps</p><p className="mt-2 text-3xl font-bold text-nexus-warn">{result.summary.gaps}</p><p className="mt-1 text-xs text-white/40">items without governed citations</p></div>
            <div className="panel"><p className="text-xs uppercase tracking-wide text-white/40">Critical gaps</p><p className="mt-2 text-3xl font-bold text-nexus-danger">{result.summary.criticalGaps}</p><p className="mt-1 text-xs text-white/40">must be reviewed by the deal team</p></div>
            <div className="panel"><p className="text-xs uppercase tracking-wide text-white/40">Passport exclusions</p><p className="mt-2 text-3xl font-bold text-nexus-sky">{result.deniedByPassport}</p><p className="mt-1 text-xs text-white/40">records excluded by governance policy</p></div>
          </section>

          <section className="panel border-nexus-danger/30">
            <p className="panel-title text-nexus-danger">Human review remains required</p>
            <p className="mt-1 text-xs leading-5 text-white/60">Coverage and gaps are evidence facts. They do not mean the deal should proceed, be rejected, or be approved. Name the advisor and IC owner before this work becomes a decision packet.</p>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="panel">
              <p className="panel-title">Checklist coverage</p>
              <p className="mt-1 text-xs text-white/45">A sample of the reviewed requirements. Open evidence to inspect citations before treating coverage as decision-useful.</p>
              <div className="mt-3 space-y-2">
                {result.coverage.slice(0, 12).map((row) => (
                  <div key={row.itemId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-white">{row.requirement}</p><p className="mt-1 text-[11px] text-white/40">{row.category}</p></div><span className={"rounded-full border px-2 py-0.5 text-[10px] font-medium " + (row.covered ? "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent" : severityTone(row.severity))}>{row.covered ? "cited" : "evidence missing"}</span></div>
                    {row.citations[0] && <p className="mt-2 truncate text-[11px] text-nexus-sky">{row.citations[0].sourcePath}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <p className="panel-title">Priority evidence requests</p>
              <p className="mt-1 text-xs text-white/45">Missing evidence is not automatically a red flag in the transaction. It is a request for a named owner to resolve, quantify, or explain.</p>
              <div className="mt-3 space-y-2">
                {result.redFlags.slice(0, 8).map((flag) => (
                  <div key={flag.itemId} className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-white">{flag.requirement}</p><span className="shrink-0 rounded-full border border-nexus-warn/30 px-2 py-0.5 text-[10px] text-nexus-warn">{flag.severity}</span></div><p className="mt-2 text-[11px] leading-4 text-white/55">Request or test: {flag.indicator}</p></div>
                ))}
                {result.redFlags.length === 0 && <p className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/10 p-3 text-xs leading-5 text-nexus-accent">No critical or high evidence gaps were identified by this checklist. A human still reviews coverage and materiality.</p>}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
