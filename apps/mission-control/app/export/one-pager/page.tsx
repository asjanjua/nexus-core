"use client";

/**
 * /export/one-pager — Print-ready executive one-pager
 *
 * Single page: workspace name, active roles, ingested docs, top findings, risks, open recommendations.
 * Designed to be shared at a board meeting or executive briefing in 2 minutes.
 */

import { useEffect, useState } from "react";
import type { OnePagerExport } from "@/lib/services/exports";

type ApiResponse = { ok: boolean; data?: { onePager: OnePagerExport }; error?: string };

export default function OnePagerPage() {
  const [data, setData] = useState<OnePagerExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/export/one-pager")
      .then(r => r.json() as Promise<ApiResponse>)
      .then(res => {
        if (res.ok && res.data) setData(res.data.onePager);
        else setError(res.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><p className="text-sm text-gray-400">Loading...</p></div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center bg-white"><p className="text-sm text-red-500">{error || "No data"}</p></div>;

  const today = new Date(data.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <span className="text-sm text-gray-500">One-pager &mdash; review before sharing</span>
        <button onClick={() => window.print()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Save as PDF</button>
      </div>

      {/* Single page — keep tight */}
      <div className="mx-auto max-w-2xl bg-white px-10 py-10 text-gray-900 print:px-0 print:py-0">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between border-b border-gray-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">NexusAI Mission Control</p>
            <h1 className="mt-0.5 text-2xl font-bold">{data.workspaceName}</h1>
          </div>
          <p className="text-sm text-gray-400">{today}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold">{data.processedRecords}</p>
            <p className="text-xs text-gray-400 mt-0.5">Evidence Records</p>
          </div>
          <div className="rounded border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold">{data.activeRoles.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active Roles</p>
          </div>
          <div className="rounded border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold">{data.openRecommendations.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Open Actions</p>
          </div>
        </div>

        {/* Active roles */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Active Roles</p>
          <div className="flex flex-wrap gap-2">
            {data.activeRoles.map(r => (
              <span key={r} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">{r}</span>
            ))}
          </div>
        </div>

        {/* Top findings */}
        {data.topFindings.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Top Findings</p>
            <ul className="space-y-1">
              {data.topFindings.map((f, i) => <li key={i} className="text-sm text-gray-700 before:mr-2 before:content-['→']">{f}</li>)}
            </ul>
          </div>
        )}

        {/* Top risks */}
        {data.topRisks.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Risk Signals</p>
            <ul className="space-y-1">
              {data.topRisks.map((r, i) => <li key={i} className="text-sm text-gray-700 before:mr-2 before:content-['⚠']">{r}</li>)}
            </ul>
          </div>
        )}

        {/* Open recommendations */}
        {data.openRecommendations.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Open Recommendations</p>
            <ul className="space-y-1">
              {data.openRecommendations.map(r => (
                <li key={r.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">{r.status.replace("_", " ")}</span>
                  <span>{r.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-300">
          NexusAI Mission Control &bull; Confidential &bull; {data.workspaceName}
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
