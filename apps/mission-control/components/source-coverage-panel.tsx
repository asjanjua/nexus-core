"use client";

import { useState, useEffect, useCallback } from "react";

interface SourceCoverageResult {
  totalEvidence: number;
  coverageScore: number;
  sourceTypes: { sourceType: string; count: number }[];
  departments: {
    department: string;
    evidenceCount: number;
    missingSourceTypes: string[];
  }[];
  missingRequired: { sourceType: string; requiredByDepartments: string[] }[];
}

export function SourceCoveragePanel() {
  const [data, setData] = useState<SourceCoverageResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/source-coverage");
      const json = await res.json();
      if (json.ok) setData(json.data ?? json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

  if (loading || !data) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/30 text-center">
        Loading source coverage…
      </div>
    );
  }

  const scoreColor =
    data.coverageScore >= 80 ? "text-green-400"
    : data.coverageScore >= 50 ? "text-amber-400"
    : "text-nexus-danger";

  return (
    <section className="rounded border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/70">Source Coverage</p>
        <span className={`text-lg font-semibold ${scoreColor}`}>
          {data.coverageScore}%
        </span>
      </div>

      {/* Source types */}
      <div className="flex flex-wrap gap-1">
        {data.sourceTypes.map((st) => (
          <span
            key={st.sourceType}
            className="rounded border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/50"
          >
            {st.sourceType} ({st.count})
          </span>
        ))}
      </div>

      {/* Missing required */}
      {data.missingRequired.length > 0 && (
        <div className="rounded border border-amber-400/20 bg-amber-400/[0.03] p-2">
          <p className="text-[10px] font-medium text-amber-400/70 mb-1">Missing Sources</p>
          {data.missingRequired.map((m) => (
            <div key={m.sourceType} className="text-[9px] text-amber-400/40">
              <span className="text-amber-400/60">{m.sourceType}</span>
              {" — "}
              {m.requiredByDepartments.join(", ")}
            </div>
          ))}
        </div>
      )}

      {/* Department gaps */}
      <div className="space-y-1">
        {data.departments
          .filter((d) => d.missingSourceTypes.length > 0)
          .map((d) => (
            <div key={d.department} className="flex items-center justify-between text-[10px]">
              <span className="text-white/50 capitalize">{d.department}</span>
              <span className="text-amber-400/50">
                missing: {d.missingSourceTypes.join(", ")}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}
