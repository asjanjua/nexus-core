"use client";

/**
 * Client access to the governed Vantage diligence review.
 *
 * WHY THIS EXISTS. The native diligence runner already computes four things —
 * coverage, red flags, model tie-outs, and IC memo section drafts — and until
 * now only the first two were ever shown. `modelTieOuts` and `icMemoSections`
 * were produced on every run and thrown away, while the Deal Room hub showed
 * hand-written numbers in their place and labelled the real screens "planned".
 *
 * So the deep routes added alongside this file are not new capability. They
 * surface work the engine was already doing. That distinction matters for a
 * pilot: everything these screens display is derived from the workspace's own
 * evidence and carries citations, rather than being illustrative.
 *
 * One shared hook rather than a fetch per screen, so every Vantage route makes
 * the same request with the same defaults and a buyer moving between them sees
 * one consistent review rather than four subtly different ones.
 */

import { useCallback, useState } from "react";

export type DealType = "fintech_ma" | "generic_ma";
export type Severity = "critical" | "high" | "medium" | "low";

export type Citation = {
  evidenceId: string;
  sourcePath: string;
  sourceSpan: string;
  confidence: number;
};

export type CoverageRow = {
  itemId: string;
  category: string;
  requirement: string;
  severity: Severity;
  covered: boolean;
  citations: Citation[];
};

export type RedFlag = {
  itemId: string;
  category: string;
  severity: Severity;
  requirement: string;
  indicator: string;
  reason: "missing_critical_evidence" | "missing_high_evidence";
};

export type ModelTieOut = {
  itemId: string;
  requirement: string;
  status: "tied_to_source" | "unverifiable";
  evidenceIds: string[];
};

export type ICMemoSection = {
  key: string;
  title: string;
  guidance: string;
  status: "populated" | "requires_author" | "flagged";
  content: string[];
};

export type DiligenceReview = {
  reviewId: string;
  dealType: DealType;
  coverage: CoverageRow[];
  redFlags: RedFlag[];
  modelTieOuts: ModelTieOut[];
  icMemoSections: ICMemoSection[];
  summary: {
    items: number;
    covered: number;
    gaps: number;
    criticalGaps: number;
    redFlags: number;
    /**
     * The runner's internal signal. Deliberately NOT rendered as a verdict
     * anywhere in the UI — Vantage must not mark a deal investable or
     * rejected, and a posture printed as a headline is that decision in all
     * but name. Kept on the type because the IC memo draft references it as
     * text the author must confirm.
     */
    recommendation: "proceed" | "proceed_with_conditions" | "do_not_proceed";
  };
};

export const DEAL_TYPES: Array<{ value: DealType; label: string; hint: string }> = [
  {
    value: "fintech_ma",
    label: "Fintech M&A",
    hint: "Fintech acquisition checklist, including regulated activity and safeguarding evidence.",
  },
  {
    value: "generic_ma",
    label: "General M&A",
    hint: "General transaction checklist across financial, commercial, legal, technology, and people diligence.",
  },
];

/** Stable per-day review id so repeated runs in a demo do not fragment the audit trail. */
export function defaultReviewId(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

export function useDiligenceReview(prefix: string) {
  const [dealType, setDealType] = useState<DealType>("fintech_ma");
  const [review, setReview] = useState<DiligenceReview | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/native-skills/vantage-diligence-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewId: defaultReviewId(prefix), dealType }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "review_failed");
      setReview(payload.data as DiligenceReview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "review_failed");
    } finally {
      setRunning(false);
    }
  }, [dealType, prefix]);

  return { dealType, setDealType, review, running, error, run };
}

/** Average citation confidence for an item, or null when nothing is cited. */
export function meanConfidence(citations: Citation[]): number | null {
  if (citations.length === 0) return null;
  return citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length;
}

/**
 * How well-supported a covered requirement is.
 *
 * Coverage is binary — an item is cited or it is not — which flatters a deal
 * where every requirement rests on exactly one weak document. Depth is the
 * distinction a diligence manager actually needs before an IC date, and it is
 * computable from citations the runner already returns.
 *
 * `thin` is the interesting state and is deliberately not called "low": one
 * source at 61% clears the runner's 0.6 threshold and still should not carry a
 * critical requirement into committee on its own.
 */
export function evidenceDepth(row: CoverageRow): "none" | "thin" | "supported" | "corroborated" {
  const n = row.citations.length;
  if (n === 0) return "none";
  const mean = meanConfidence(row.citations) ?? 0;
  if (n === 1 || mean < 0.7) return "thin";
  if (n >= 3 && mean >= 0.8) return "corroborated";
  return "supported";
}
