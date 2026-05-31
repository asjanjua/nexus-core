"use client";

/**
 * /export/weekly-brief — Print-ready weekly executive brief
 *
 * Fetches data from /api/export/weekly-brief and renders a print-optimised
 * page. Pilot clients use browser Print > Save as PDF.
 * AI responsibility: AI generates the narrative; humans review before sharing.
 */

import { useEffect, useState } from "react";
import type { WeeklyBriefExport } from "@/lib/services/exports";

type ApiResponse = { ok: boolean; data?: { brief: WeeklyBriefExport }; error?: string };

const severityColor = (s: string) =>
  s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#6b7280";

export default function WeeklyBriefPage() {
  const [brief, setBrief] = useState<WeeklyBriefExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/export/weekly-brief")
      .then(r => r.json() as Promise<ApiResponse>)
      .then(res => {
        if (res.ok && res.data) setBrief(res.data.brief);
        else setError(res.error ?? "Failed to load brief");
      })
      .catch(() => setError("Network error — could not load brief"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Generating executive brief...</p>
    </div>
  );

  if (error || !brief) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-red-500">{error || "No brief available"}</p>
    </div>
  );

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <span className="text-sm text-gray-500">Review before sharing externally</span>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Save as PDF
        </button>
      </div>

      {/* Print content */}
      <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 print:px-0 print:py-0">
        {/* Cover */}
        <div className="mb-10 border-b border-gray-200 pb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">NexusAI Mission Control</p>
          <h1 className="text-3xl font-bold">{brief.workspaceName}</h1>
          <h2 className="mt-1 text-xl text-gray-500">Weekly Executive Brief</h2>
          <p className="mt-2 text-sm text-gray-400">Week ending {brief.weekEnding} &bull; Generated {new Date(brief.generatedAt).toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400 italic">AI-generated from approved evidence. Human review required before external distribution.</p>
        </div>

        {/* Role briefs */}
        <section className="mb-10">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Executive Briefs</h3>
          <div className="space-y-6">
            {brief.activeRoles.map((rb) => (
              <div key={rb.role} className="rounded-lg border border-gray-100 p-5">
                <p className="mb-2 text-sm font-semibold text-gray-700">{rb.label}</p>
                <p className="text-sm leading-relaxed text-gray-800">{rb.narrative}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Top risks */}
        {brief.topRisks.length > 0 && (
          <section className="mb-10">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Top Risk Signals</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Severity</th>
                  <th className="pb-2 pr-4 font-medium">Signal</th>
                  <th className="pb-2 pr-4 font-medium">Department</th>
                  <th className="pb-2 font-medium">Freshness</th>
                </tr>
              </thead>
              <tbody>
                {brief.topRisks.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <span style={{ color: severityColor(r.severity) }} className="font-semibold uppercase text-xs">{r.severity}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-800">{r.title}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.department}</td>
                    <td className="py-2 text-gray-400">{r.freshnessHours}h ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recommendations summary */}
        <section className="mb-10 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{brief.openRecommendations}</p>
            <p className="mt-1 text-xs text-gray-400">Open Recommendations</p>
          </div>
          <div className="rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{brief.approvedRecommendations}</p>
            <p className="mt-1 text-xs text-gray-400">Approved This Cycle</p>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-300">
          NexusAI Mission Control &bull; Confidential &bull; For authorised recipients only
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}
