import Link from "next/link";
import type { EvidenceRecord } from "@/lib/contracts";

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function sourceLabel(record: EvidenceRecord): string {
  const dept = record.department ? `${record.department} · ` : "";
  return `${dept}${record.sourceType} · ${Math.round(record.extractionConfidence * 100)}% confidence`;
}

export function EvidenceSourceList({
  records,
  ids,
  compact = false,
}: {
  records: EvidenceRecord[];
  ids: string[];
  compact?: boolean;
}) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const sources = ids.map((id) => byId.get(id)).filter((record): record is EvidenceRecord => Boolean(record));

  if (sources.length === 0) {
    return (
      <p className="mt-2 text-xs text-white/40">
        Based on {ids.length} source{ids.length !== 1 ? "s" : ""}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.slice(0, 3).map((source) => (
          <Link
            key={source.id}
            href={`/evidence/${source.id}`}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/55 hover:border-nexus-accent/50 hover:text-white"
            title={source.sourcePath}
          >
            {fileName(source.sourcePath)}
          </Link>
        ))}
        {sources.length > 3 && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/35">
            +{sources.length - 3} more
          </span>
        )}
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {sources.map((source) => (
        <li key={source.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
          <Link href={`/evidence/${source.id}`} className="text-sm font-medium text-white hover:text-nexus-accent">
            {fileName(source.sourcePath)}
          </Link>
          <p className="mt-1 text-xs text-white/45">{sourceLabel(source)}</p>
        </li>
      ))}
    </ul>
  );
}
