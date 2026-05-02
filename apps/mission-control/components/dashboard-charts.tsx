/**
 * Role-aware dashboard chart panels — server component.
 *
 * Fetches real data from the repository, computes derived metrics,
 * and renders role-specific chart layouts using the pure SVG primitives.
 *
 * CEO:    Risk Radar | Recommendation Pipeline Donut | Evidence Quality Gauge
 * COO:    Ingestion Health Donut | Source Mix Bars | Freshness Bars
 * CBO:    Decision Status Donut | Evidence Confidence Bars
 * CTO:    Data Quality Gauge | Ingestion Status Donut | Source Type Bars
 */

import type { EvidenceRecord, Recommendation, Decision, Role } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import {
  C,
  DonutChart,
  GaugeChart,
  HorizontalBarChart,
  MiniStat,
  RadarChart,
} from "@/components/charts";
import type { DonutSegment, BarItem, RadarDimension } from "@/components/charts";

const WORKSPACE_ID = process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function avgConfidence(records: EvidenceRecord[]): number {
  if (!records.length) return 0;
  return records.reduce((s, r) => s + r.extractionConfidence, 0) / records.length;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Score 5 risk dimensions by keyword density over processed evidence text.
 * Returns values 0-1. Higher = more signals found in evidence.
 */
function scoreRiskDimensions(evidence: EvidenceRecord[]): RadarDimension[] {
  const DIMS: Array<{ label: string; keywords: string[] }> = [
    {
      label: "Financial",
      keywords: ["margin", "revenue", "cost", "budget", "pricing", "profit", "loss", "cash", "fee"],
    },
    {
      label: "Operational",
      keywords: ["delay", "blocker", "onboarding", "handoff", "process", "kyc", "workflow", "queue", "overdue"],
    },
    {
      label: "Strategic",
      keywords: ["decision", "priority", "partner", "pipeline", "strategy", "market", "growth", "opportunity"],
    },
    {
      label: "Compliance",
      keywords: ["regulatory", "compliance", "aml", "kyc", "audit", "policy", "control", "risk", "governance"],
    },
    {
      label: "Technology",
      keywords: ["system", "platform", "api", "integration", "data", "security", "infrastructure", "ai", "model"],
    },
  ];

  const processed = evidence.filter((e) => e.ingestionStatus === "processed");
  const combinedText = processed.map((e) => e.text.toLowerCase()).join(" ");

  return DIMS.map((dim) => {
    const hits = dim.keywords.filter((kw) => combinedText.includes(kw)).length;
    const rawScore = hits / dim.keywords.length;
    // Amplify slightly so single signals show up; cap at 0.95
    const value = Math.min(0.95, rawScore * 1.8);
    return { label: dim.label, value: Number(value.toFixed(2)) };
  });
}

// ---------------------------------------------------------------------------
// CEO Charts
// ---------------------------------------------------------------------------

async function CEOCharts() {
  const [evidence, recs] = await Promise.all([
    repository.getEvidenceForWorkspace(WORKSPACE_ID),
    repository.getRecommendations(WORKSPACE_ID),
  ]);

  const processed = evidence.filter((e) => e.ingestionStatus === "processed");
  const qualityScore = avgConfidence(processed);
  const riskDimensions = scoreRiskDimensions(evidence);

  const recByStatus = countBy(recs, (r) => r.status);
  const recSegments: DonutSegment[] = [
    { label: "Draft",     value: recByStatus.draft     ?? 0, color: C.purple },
    { label: "In Review", value: recByStatus.in_review ?? 0, color: C.warn   },
    { label: "Approved",  value: recByStatus.approved  ?? 0, color: C.accent },
    { label: "Promoted",  value: recByStatus.promoted  ?? 0, color: C.blue   },
    { label: "Rejected",  value: recByStatus.rejected  ?? 0, color: C.danger },
  ].filter((s) => s.value > 0);

  const totalRecs = recs.length;

  // Mini stats
  const openDecisions = (await repository.getDecisions(WORKSPACE_ID)).filter(
    (d) => d.status === "open"
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Evidence Items"  value={evidence.length}  sub={`${processed.length} processed`} />
        <MiniStat label="Recommendations" value={totalRecs}         sub="in pipeline" />
        <MiniStat label="Open Decisions"  value={openDecisions}     sub="awaiting action" color={openDecisions > 0 ? C.warn : C.accent} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-4">
          <RadarChart dimensions={riskDimensions} title="Risk Radar" size={210} />
        </div>
        <div className="panel flex flex-col items-center justify-center py-4">
          <DonutChart
            segments={recSegments.length ? recSegments : [{ label: "No data", value: 1, color: C.muted }]}
            centerLabel={String(totalRecs)}
            centerSub="recs"
            title="Recommendation Pipeline"
          />
        </div>
        <div className="panel flex flex-col items-center justify-center py-4">
          <GaugeChart
            value={qualityScore}
            label="Evidence Quality"
            sublabel={`${processed.length} of ${evidence.length} processed`}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COO Charts
// ---------------------------------------------------------------------------

async function COOCharts() {
  const evidence = await repository.getEvidenceForWorkspace(WORKSPACE_ID);

  const byStatus = countBy(evidence, (e) => e.ingestionStatus);
  const bySource = countBy(evidence, (e) => e.sourceType);

  const statusSegments: DonutSegment[] = [
    { label: "Processed",   value: byStatus.processed   ?? 0, color: C.accent },
    { label: "Quarantined", value: byStatus.quarantined ?? 0, color: C.danger },
    { label: "Queued",      value: byStatus.queued       ?? 0, color: C.warn   },
    { label: "Failed",      value: byStatus.failed       ?? 0, color: C.purple },
  ].filter((s) => s.value > 0);

  const sourceBars: BarItem[] = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  // Freshness buckets (hours)
  const freshnessBuckets = [
    { label: "< 24h",   min: 0,   max: 24  },
    { label: "1-3 days", min: 24,  max: 72  },
    { label: "3-7 days", min: 72,  max: 168 },
    { label: "> 7 days", min: 168, max: Infinity },
  ];
  const freshnessBars: BarItem[] = freshnessBuckets.map((b) => ({
    label: b.label,
    value: evidence.filter((e) => e.freshnessHours >= b.min && e.freshnessHours < b.max).length,
    color: b.min >= 168 ? C.danger : b.min >= 72 ? C.warn : C.accent,
  }));

  const processed = evidence.filter((e) => e.ingestionStatus === "processed");
  const quarantinedPct = evidence.length
    ? Math.round(((byStatus.quarantined ?? 0) / evidence.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total Evidence"   value={evidence.length}   sub="all sources" />
        <MiniStat label="Processed"        value={processed.length}  sub="ready for analysis" color={C.accent} />
        <MiniStat label="Quarantine Rate"  value={`${quarantinedPct}%`} sub="needs review" color={quarantinedPct > 20 ? C.danger : C.warn} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-4">
          <DonutChart
            segments={statusSegments.length ? statusSegments : [{ label: "No data", value: 1, color: C.muted }]}
            centerLabel={String(evidence.length)}
            centerSub="items"
            title="Ingestion Health"
          />
        </div>
        <div className="panel py-4 px-4">
          <HorizontalBarChart data={sourceBars.length ? sourceBars : [{ label: "No sources", value: 0 }]} title="Source Type Mix" />
        </div>
        <div className="panel py-4 px-4">
          <HorizontalBarChart
            data={freshnessBars}
            title="Evidence Age"
            warnAbove={72}
            dangerAbove={168}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CBO Charts
// ---------------------------------------------------------------------------

async function CBOCharts() {
  const [evidence, decisions, recs] = await Promise.all([
    repository.getEvidenceForWorkspace(WORKSPACE_ID),
    repository.getDecisions(WORKSPACE_ID),
    repository.getRecommendations(WORKSPACE_ID),
  ]);

  const byDecisionStatus = countBy(decisions, (d) => d.status);
  const decisionSegments: DonutSegment[] = [
    { label: "Open",       value: byDecisionStatus.open       ?? 0, color: C.warn   },
    { label: "Decided",    value: byDecisionStatus.decided    ?? 0, color: C.accent },
    { label: "Superseded", value: byDecisionStatus.superseded ?? 0, color: C.muted  },
  ].filter((s) => s.value > 0);

  // Evidence confidence per source type
  const sourceGroups: Record<string, number[]> = {};
  for (const e of evidence.filter((ev) => ev.ingestionStatus === "processed")) {
    if (!sourceGroups[e.sourceType]) sourceGroups[e.sourceType] = [];
    sourceGroups[e.sourceType].push(e.extractionConfidence);
  }
  const confidenceBars: BarItem[] = Object.entries(sourceGroups).map(([label, vals]) => ({
    label,
    value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100),
    color: vals.reduce((s, v) => s + v, 0) / vals.length >= 0.75 ? C.accent : C.warn,
  }));

  // Recommendation confidence bars
  const recConfBars: BarItem[] = recs.map((r) => ({
    label: r.title.slice(0, 28) + (r.title.length > 28 ? "…" : ""),
    value: Math.round(r.confidence * 100),
    color: r.confidence >= 0.75 ? C.accent : r.confidence >= 0.55 ? C.warn : C.danger,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Decisions"       value={decisions.length}  sub={`${byDecisionStatus.open ?? 0} open`} color={byDecisionStatus.open ? C.warn : C.accent} />
        <MiniStat label="Recommendations" value={recs.length}       sub="in pipeline" />
        <MiniStat label="Evidence Items"  value={evidence.filter(e => e.ingestionStatus === "processed").length} sub="processed" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-4">
          <DonutChart
            segments={decisionSegments.length ? decisionSegments : [{ label: "No data", value: 1, color: C.muted }]}
            centerLabel={String(decisions.length)}
            centerSub="decisions"
            title="Decision Status"
          />
        </div>
        <div className="panel py-4 px-4">
          <HorizontalBarChart
            data={confidenceBars.length ? confidenceBars : [{ label: "No data", value: 0 }]}
            title="Evidence Confidence by Source"
            maxValue={100}
            unit="%"
            warnAbove={60}
          />
        </div>
        <div className="panel py-4 px-4">
          <HorizontalBarChart
            data={recConfBars.length ? recConfBars : [{ label: "No recommendations", value: 0 }]}
            title="Recommendation Confidence"
            maxValue={100}
            unit="%"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTO/CDO Charts
// ---------------------------------------------------------------------------

async function CTOCharts() {
  const evidence = await repository.getEvidenceForWorkspace(WORKSPACE_ID);

  const processed = evidence.filter((e) => e.ingestionStatus === "processed");
  const quality = avgConfidence(processed);

  const byStatus = countBy(evidence, (e) => e.ingestionStatus);
  const bySource = countBy(evidence, (e) => e.sourceType);

  const statusSegments: DonutSegment[] = [
    { label: "Processed",   value: byStatus.processed   ?? 0, color: C.accent },
    { label: "Quarantined", value: byStatus.quarantined ?? 0, color: C.danger },
    { label: "Queued",      value: byStatus.queued       ?? 0, color: C.warn   },
    { label: "Triaged",     value: byStatus.triaged      ?? 0, color: C.blue   },
    { label: "Failed",      value: byStatus.failed       ?? 0, color: C.purple },
  ].filter((s) => s.value > 0);

  const sourceBars: BarItem[] = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  // Confidence distribution histogram (10% buckets)
  const confBuckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((floor) => ({
    label: `${floor}-${floor + 10}%`,
    value: evidence.filter(
      (e) => e.extractionConfidence * 100 >= floor && e.extractionConfidence * 100 < floor + 10
    ).length,
    color: floor >= 70 ? C.accent : floor >= 50 ? C.warn : C.danger,
  }));

  const processRate = evidence.length
    ? Math.round(((byStatus.processed ?? 0) / evidence.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Avg Confidence"   value={`${Math.round(quality * 100)}%`}  sub="processed evidence" color={quality >= 0.75 ? C.accent : C.warn} />
        <MiniStat label="Process Rate"     value={`${processRate}%`}                sub="of all ingested" color={processRate >= 80 ? C.accent : C.warn} />
        <MiniStat label="Quarantined"      value={byStatus.quarantined ?? 0}         sub="needs review" color={(byStatus.quarantined ?? 0) > 0 ? C.danger : C.accent} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-4">
          <GaugeChart
            value={quality}
            label="Data Quality Score"
            sublabel={`Based on ${processed.length} records`}
          />
        </div>
        <div className="panel flex flex-col items-center justify-center py-4">
          <DonutChart
            segments={statusSegments.length ? statusSegments : [{ label: "No data", value: 1, color: C.muted }]}
            centerLabel={String(evidence.length)}
            centerSub="total"
            title="Ingestion Pipeline Status"
          />
        </div>
        <div className="panel py-4 px-4">
          <HorizontalBarChart
            data={sourceBars.length ? sourceBars : [{ label: "No sources", value: 0 }]}
            title="Source Type Breakdown"
          />
        </div>
      </div>

      {/* Confidence histogram — full width */}
      <div className="panel py-4 px-4">
        <HorizontalBarChart
          data={confBuckets.filter((b) => b.value > 0)}
          title="Extraction Confidence Distribution"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — role router
// ---------------------------------------------------------------------------

export async function DashboardCharts({ role }: { role: Role }) {
  switch (role) {
    case "ceo": return <CEOCharts />;
    case "coo": return <COOCharts />;
    case "cbo": return <CBOCharts />;
    case "cto": return <CTOCharts />;
  }
}
