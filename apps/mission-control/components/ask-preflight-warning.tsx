"use client";

/**
 * Ask Pre-flight Warning — shows source coverage status
 * before LLM synthesis. Warns when coverage is weak to
 * prevent low-confidence outputs from surfacing to executives.
 *
 * Fetches /api/workspace/source-coverage on mount.
 * Renders a warning banner when coverageScore < 50%
 * or missing required sources exist.
 */

import { useState, useEffect, useCallback } from "react";

interface CoverageResult {
  coverageScore: number;
  missingRequired: { sourceType: string; requiredByDepartments: string[] }[];
}

export function AskPreflightWarning() {
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchCoverage = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/source-coverage");
      const json = await res.json();
      if (json.ok) setCoverage(json.data ?? json);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

  if (!coverage || coverage.coverageScore >= 80 || dismissed) return null;

  const isCritical = coverage.coverageScore < 50;

  return (
    <div
      className={`rounded border p-3 text-xs ${
        isCritical
          ? "border-nexus-danger/30 bg-nexus-danger/[0.04]"
          : "border-amber-400/30 bg-amber-400/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-medium ${isCritical ? "text-nexus-danger" : "text-amber-400"}`}>
            {isCritical ? "Low source coverage" : "Limited source coverage"}
          </p>
          <p className="mt-1 text-white/40">
            Source coverage is {coverage.coverageScore}%.
            {coverage.missingRequired.length > 0 && (
              <>
                {" "}Missing:{" "}
                {coverage.missingRequired.map((m) => m.sourceType).join(", ")}.
              </>
            )}
            {" "}Outputs may have lower confidence until more evidence is ingested.
          </p>
        </div>
        <button
          className="text-white/20 hover:text-white/50 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </div>
    </div>
  );
}
