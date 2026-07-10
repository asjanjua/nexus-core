/**
 * /pilot-kit — Pilot Sponsor Kit
 *
 * Print-ready sponsor onboarding checklist and pilot success scorecard.
 * Given to the pilot sponsor at kickoff. Not a product tutorial — a business readiness guide.
 */

import { requireWorkspaceId } from "@/lib/safe-auth";
import { repository } from "@/lib/data/repository";

export default async function PilotKitPage() {
  const workspaceId = await requireWorkspaceId("/pilot-kit");
  const settings = await repository.getWorkspaceSettings(workspaceId);
  const workspaceName = settings?.name ?? "Your Organisation";
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      {/* Print controls */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex gap-3">
          <a href="/export" className="text-sm text-gray-500 hover:text-gray-800">← Export Hub</a>
          <span className="text-gray-200">|</span>
          <span className="text-sm text-gray-500">Pilot Sponsor Kit — share at kickoff</span>
        </div>
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 print:px-0 print:py-0">

        {/* ------------------------------------------------------------------ */}
        {/* Part 1: Sponsor Onboarding Checklist                                */}
        {/* ------------------------------------------------------------------ */}

        <div className="mb-16 print:mb-10">
          <div className="mb-8 border-b-2 border-gray-900 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">NexusAI Mission Control</p>
            <h1 className="mt-1 text-2xl font-bold">Pilot Sponsor Onboarding Checklist</h1>
            <p className="mt-1 text-sm text-gray-500">{workspaceName} &bull; Pilot kickoff {today}</p>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            This checklist prepares you and your team to get maximum value from the NexusAI pilot.
            Complete each section in order. Most organisations are fully operational within 48 hours of kickoff.
          </p>

          {[
            {
              step: "1",
              title: "Before your first login",
              items: [
                "Identify the 2–3 documents that best describe your business today (board pack, risk register, strategy deck, or equivalent).",
                "Decide which leadership roles will use the platform first: CEO, COO, CFO, or equivalent.",
                "Confirm who holds the admin role for the workspace — this person uploads documents and manages settings.",
                "Check that your documents are in a supported format: PDF, DOCX, XLSX, PPTX, or plain text.",
              ],
            },
            {
              step: "2",
              title: "First session (Day 1 — 30 minutes)",
              items: [
                "Complete the onboarding wizard: describe your company in plain language. The AI will infer your sector, roles, and suggested documents.",
                "Upload your first 3–5 documents. Start with the most current board pack or management report.",
                "Review the auto-suggested department and sensitivity labels for each file — adjust if needed.",
                "Select your priority roles (CEO, COO, CFO, etc.) and confirm the Go Live dashboard.",
                "Ask your first question in the Ask panel: 'What are the top risks in our current evidence?'",
              ],
            },
            {
              step: "3",
              title: "First week",
              items: [
                "Review the dashboard cards for each active role — do the agent briefs reflect your actual priorities?",
                "Upload at least one document per active department (Finance, Operations, Risk, Technology).",
                "Review the Recommendations panel — approve or reject each AI-generated recommendation.",
                "Use the Ask panel daily: treat it as a senior analyst you can query any time.",
                "Submit feedback using the in-app button if anything is unclear or missing.",
              ],
            },
            {
              step: "4",
              title: "End of first month",
              items: [
                "Export the Weekly Executive Brief from the Export Hub and share with your leadership team.",
                "Export the Risk Radar CSV and compare against your existing risk register.",
                "Review the Recommendation Register — how many recommendations have been actioned?",
                "Schedule a 30-minute review call with your NexusAI pilot contact to assess progress.",
                "Confirm whether additional roles or departments should be added to the workspace.",
              ],
            },
            {
              step: "5",
              title: "Pilot success criteria (agreed at kickoff)",
              items: [
                "CEO or equivalent reviews the dashboard at least 3 times per week.",
                "At least 3 AI-generated recommendations are actioned by Day 30.",
                "All active role dashboards are populated with relevant evidence.",
                "The Ask panel is used to answer at least one real business question per week.",
                "Weekly brief is reviewed by the sponsor before the end of each week.",
              ],
            },
          ].map((section) => (
            <div key={section.step} className="mb-7">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {section.step}
                </span>
                <h2 className="text-sm font-semibold">{section.title}</h2>
              </div>
              <ul className="space-y-2 pl-10">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 text-gray-300 text-xs">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
            <strong className="text-gray-700">Support:</strong> Contact your NexusAI pilot lead directly for any issues.
            Response within 4 business hours. Critical issues (dashboard down, data concern) within 1 hour.
          </div>
        </div>

        {/* Page break for print */}
        <div className="hidden print:block print:break-before-page" />

        {/* ------------------------------------------------------------------ */}
        {/* Part 2: Pilot Success Scorecard                                     */}
        {/* ------------------------------------------------------------------ */}

        <div>
          <div className="mb-8 border-b-2 border-gray-900 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">NexusAI Mission Control</p>
            <h1 className="mt-1 text-2xl font-bold">Pilot Success Scorecard</h1>
            <p className="mt-1 text-sm text-gray-500">{workspaceName} &bull; 90-Day Pilot</p>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            This scorecard tracks 7 measurable outcomes agreed at kickoff. Review at Day 30, Day 60, and Day 90.
            It forms the basis of the renewal conversation and demonstrates value to leadership.
          </p>

          <table className="w-full text-sm border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-gray-500">Outcome</th>
                <th className="pb-2 pr-4 text-center text-xs font-semibold text-gray-500">Day 30</th>
                <th className="pb-2 pr-4 text-center text-xs font-semibold text-gray-500">Day 60</th>
                <th className="pb-2 text-center text-xs font-semibold text-gray-500">Day 90</th>
              </tr>
            </thead>
            <tbody>
              {[
                { outcome: "CEO / sponsor reviews the dashboard 3+ times per week (avg)", target: "Consistent weekly habit established" },
                { outcome: "Evidence records uploaded across all active roles", target: "Minimum 5 documents per role" },
                { outcome: "AI recommendations reviewed and acted on", target: "3+ recommendations approved and executed" },
                { outcome: "Ask panel used to answer a real business question per week", target: "Minimum 4 questions per month" },
                { outcome: "Weekly executive brief exported and reviewed by leadership", target: "Every week of the pilot" },
                { outcome: "Risk radar reviewed against existing risk register", target: "Monthly review, gaps identified" },
                { outcome: "Sponsor satisfaction (1–10): would recommend NexusAI to a peer", target: "Score of 8 or above at Day 90" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 pr-4 text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-3 pr-4 text-gray-800">
                    <div>{row.outcome}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Target: {row.target}</div>
                  </td>
                  {["Day 30", "Day 60", "Day 90"].map((d) => (
                    <td key={d} className="py-3 pr-4 text-center">
                      <div className="mx-auto h-7 w-16 rounded border border-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Pilot Sponsor Sign-off</p>
              <div className="h-8 border-b border-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Name / Role</p>
              <div className="mt-3 h-8 border-b border-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Date</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">NexusAI Pilot Lead Sign-off</p>
              <div className="h-8 border-b border-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Name</p>
              <div className="mt-3 h-8 border-b border-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Date</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
            <strong className="text-gray-700">Renewal decision point:</strong> At Day 90, a scorecard score of 5+/7
            outcomes met is the basis for a pilot-to-production conversion at the agreed commercial terms.
            Pricing anchor: $3,000–$8,000/month per workspace. Leap Associates will present a renewal proposal
            at the Day 90 review call.
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-300">
          NexusAI Mission Control &bull; Confidential &bull; {workspaceName} Pilot Kit
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </>
  );
}
