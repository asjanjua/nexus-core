/**
 * Source coverage map — shows which evidence families are present, weak,
 * stale, quarantined, or missing BEFORE the user reads a weak brief.
 *
 * Design-system notes: statuses use the locked vocabulary promised by the
 * "Source coverage" trust card (found / weak / missing / stale / quarantined).
 * Colour is never the only signal — every pill carries an icon and the row
 * carries an explicit count breakdown. Server component, no client state.
 */

import type { EvidenceRecord, EvidenceSourceType } from "@/lib/contracts";
import { PillIcon, TONE_SOFT, type Tone } from "@/components/ui/nexus-primitives";
import { HelpLabel } from "@/components/ui/help-dialog";

// ---------------------------------------------------------------------------
// Evidence families — demo-legible groupings of raw sourceType values
// ---------------------------------------------------------------------------

const FAMILIES: { id: string; label: string; types: EvidenceSourceType[] }[] = [
  {
    id: "documents",
    label: "Documents & board packs",
    types: ["upload", "document", "pdf", "docx", "pptx", "md", "txt"],
  },
  {
    id: "financials",
    label: "Financials",
    types: ["xlsx", "csv", "finance_export"],
  },
  {
    id: "communications",
    label: "Communications",
    types: ["slack", "teams", "email_crm", "whatsapp_business"],
  },
  {
    id: "delivery",
    label: "Delivery systems",
    types: ["jira", "github"],
  },
  {
    id: "market",
    label: "CRM & market signals",
    types: ["crm", "ad_performance", "local_ad_performance", "social_export", "creator_performance", "local_business"],
  },
  {
    id: "governance",
    label: "Contracts & audit",
    types: ["contract", "audit", "google_drive", "sharepoint"],
  },
];

const STALE_HOURS = 24 * 7;
const WEAK_CONFIDENCE = 0.7;

type CoverageStatus = "found" | "weak" | "stale" | "quarantined" | "missing";

const STATUS_META: Record<
  CoverageStatus,
  { tone: Tone | null; icon: "check" | "alert" | "arrow"; label: string }
> = {
  found: { tone: "accent", icon: "check", label: "found" },
  weak: { tone: "warn", icon: "alert", label: "weak" },
  stale: { tone: "warn", icon: "alert", label: "stale" },
  quarantined: { tone: "danger", icon: "alert", label: "quarantined" },
  missing: { tone: null, icon: "arrow", label: "missing" },
};

function familyCoverage(records: EvidenceRecord[]): {
  status: CoverageStatus;
  detail: string;
} {
  if (!records.length) {
    return { status: "missing", detail: "No evidence connected for this family yet." };
  }
  const processed = records.filter((r) => r.ingestionStatus === "processed");
  const blocked = records.filter(
    (r) => r.ingestionStatus === "quarantined" || r.ingestionStatus === "failed"
  );
  const pending = records.length - processed.length - blocked.length;

  const parts = [
    `${processed.length} processed`,
    ...(pending > 0 ? [`${pending} pending review`] : []),
    ...(blocked.length > 0 ? [`${blocked.length} quarantined`] : []),
  ];

  if (!processed.length && blocked.length) {
    return { status: "quarantined", detail: parts.join(" · ") };
  }
  if (!processed.length) {
    return { status: "weak", detail: parts.join(" · ") };
  }

  const avgConf =
    processed.reduce((s, r) => s + r.extractionConfidence, 0) / processed.length;
  const minFreshness = Math.min(...processed.map((r) => r.freshnessHours));
  parts.push(`conf ${Math.round(avgConf * 100)}%`);

  if (avgConf < WEAK_CONFIDENCE) {
    return { status: "weak", detail: parts.join(" · ") };
  }
  if (minFreshness > STALE_HOURS) {
    return {
      status: "stale",
      detail: `${parts.join(" · ")} · newest ${Math.round(minFreshness / 24)}d old`,
    };
  }
  return { status: "found", detail: parts.join(" · ") };
}

function CoveragePill({ status }: { status: CoverageStatus }) {
  const meta = STATUS_META[status];
  const toneClass = meta.tone
    ? TONE_SOFT[meta.tone]
    : "bg-white/5 text-nexus-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}
    >
      <PillIcon kind={meta.icon} />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function SourceCoverageMap({ evidence }: { evidence: EvidenceRecord[] }) {
  const rows = FAMILIES.map((family) => {
    const records = evidence.filter((r) => family.types.includes(r.sourceType));
    return { family, records, ...familyCoverage(records) };
  });
  const presentCount = rows.filter((r) => r.status === "found").length;
  const gapRows = rows.filter((r) => r.status !== "found");

  return (
    <div id="source-coverage" className="rounded-lg border border-nexus-border bg-nexus-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-nexus-text">
            <HelpLabel
              title="Source coverage map"
              help="Briefs are only as strong as the evidence behind them. This map shows which evidence families Nexus can currently see, which are weak or stale, and which are missing entirely. If a brief feels thin, check here first — the gap is usually a missing family, not a model problem."
            >
              Source coverage map
            </HelpLabel>
          </p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            {presentCount} of {FAMILIES.length} evidence families present.
            {gapRows.length > 0
              ? " Outputs that depend on the gaps below will be weaker or held for review."
              : " Evidence base is healthy across all families."}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        {rows.map(({ family, records, status, detail }) => (
          <div
            key={family.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-2 odd:bg-white/[0.02]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-nexus-text">
                {family.label}
                {records.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-nexus-muted">
                    {records.length}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-nexus-muted">{detail}</p>
            </div>
            <CoveragePill status={status} />
          </div>
        ))}
      </div>
    </div>
  );
}
