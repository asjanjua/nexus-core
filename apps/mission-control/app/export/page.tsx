/**
 * /export — Pilot Delivery Hub
 *
 * Entry point for all pilot export artifacts.
 * Each export type has its own page for print/download.
 */

import { auth } from "@clerk/nextjs/server";
import { repository } from "@/lib/data/repository";

export default async function ExportHubPage() {
  const { userId, orgId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const settings = await repository.getWorkspaceSettings(workspaceId);
  const workspaceName = settings?.name ?? workspaceId;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const exports = [
    {
      href: "/export/weekly-brief",
      label: "Weekly Executive Brief",
      description: "AI-generated narrative for all active roles. Review before sharing.",
      badge: "PDF",
      color: "blue",
    },
    {
      href: "/export/one-pager",
      label: "Executive One-Pager",
      description: "Single page: active roles, top findings, risks, open recommendations.",
      badge: "PDF",
      color: "blue",
    },
    {
      href: "/api/export/risk-radar?format=csv",
      label: "Risk Radar",
      description: "Current risk signals extracted from evidence, ranked by severity.",
      badge: "CSV",
      color: "amber",
      download: true,
    },
    {
      href: "/api/export/reco-register?format=csv",
      label: "Recommendation Register",
      description: "All recommendations with status, owner, confidence, and evidence refs.",
      badge: "CSV",
      color: "amber",
      download: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070f1e] p-6 sm:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">NexusAI Mission Control</p>
          <h1 className="text-2xl font-semibold text-white">{workspaceName}</h1>
          <p className="mt-1 text-sm text-white/50">Pilot Delivery Exports &mdash; {today}</p>
        </div>

        <div className="space-y-3">
          {exports.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target={item.download ? "_self" : "_blank"}
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/8"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{item.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    item.color === "blue"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {item.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/50">{item.description}</p>
              </div>
              <svg className="ml-4 h-4 w-4 flex-shrink-0 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.download ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" : "M9 5l7 7-7 7"} />
              </svg>
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-white/5 bg-white/3 px-5 py-4 text-xs text-white/40">
          <p className="font-medium text-white/60">AI Responsibility Notice</p>
          <p className="mt-1">The Weekly Executive Brief contains AI-generated narrative. Review all content before sharing externally. Risk Radar and Recommendation Register are direct data extractions — no AI generation.</p>
        </div>
      </div>
    </div>
  );
}
