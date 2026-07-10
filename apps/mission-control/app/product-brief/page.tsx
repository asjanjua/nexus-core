/**
 * /product-brief — NexusAI Mission Control Product Brief
 *
 * One-page overview sent after a first call. Print-ready PDF via browser print.
 * Public route — no auth required so it can be shared as a link.
 */

export default function ProductBriefPage() {
  return (
    <>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <span className="text-sm text-gray-500">NexusAI Mission Control — Product Brief</span>
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 print:px-0 print:py-0">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between border-b-2 border-gray-900 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Leap Associates FZCO</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">NexusAI</h1>
            <p className="mt-1 text-xl text-gray-600">Mission Control for Executive Teams</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>Confidential</p>
            <p>nexusai.io</p>
            <p>ali.janjua@live.com</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mb-8 rounded-xl bg-gray-50 px-6 py-5">
          <p className="text-lg font-medium leading-relaxed text-gray-800">
            NexusAI turns your company&apos;s documents, reports, and data into a real-time executive intelligence layer. Every brief is grounded in evidence. Every answer links back to a source. Every insight is role-aware.
          </p>
        </div>

        {/* The problem */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">The Problem</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                "CEOs spend 4–6 hours per week reading reports and preparing for board meetings.",
                "Risks buried in board packs go unnoticed until they become crises.",
                "AI tools give generic answers — not grounded in your actual company documents.",
                "Different leaders use different tools. Nothing is connected.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">The NexusAI Answer</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                "Upload your documents once. Get role-specific briefs daily, grounded in your evidence.",
                "Risk signals surface automatically from your board packs, compliance reports, and operations data.",
                "Every AI answer cites the source document and shows confidence. No hallucinations.",
                "CEO, COO, CFO, CTO and 16 more roles — each sees exactly what they need.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-900" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">How It Works</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { step: "1", title: "Upload", desc: "Board packs, risk registers, financials, ops reports, strategy docs. PDF, Word, Excel, PowerPoint." },
              { step: "2", title: "AI Reads", desc: "NexusAI extracts, classifies, and ingests every document. Confidence-scored. Sensitivity-aware." },
              { step: "3", title: "Briefs Generate", desc: "Role-specific agent briefs appear in the Executive Command Room, Finance Room, Risk Room, and more." },
              { step: "4", title: "You Decide", desc: "Ask questions in plain English. Approve recommendations. Export the weekly brief. Act on evidence." },
            ].map((item) => (
              <div key={item.step} className="rounded-lg border border-gray-100 p-4">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">{item.step}</div>
                <p className="mb-1 text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key capabilities */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Agent Rooms</h2>
            <ul className="space-y-1 text-xs text-gray-600">
              {["Executive Command Room (CEO)", "Finance Room (CFO)", "Risk Room (CRO)", "Operating Room (COO)", "Growth Room (CMO/Growth)", "People Room (CHRO)", "Technology Room (CTO)", "+ 13 more specialist roles"].map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Evidence Sources</h2>
            <ul className="space-y-1 text-xs text-gray-600">
              {["Board packs and board papers", "Financial reports and MRR dashboards", "Risk registers and compliance reports", "Operational reports and KPI decks", "Strategy documents and roadmaps", "HR and people reports", "Paid ads and social exports", "WhatsApp Business exports"].map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Pilot Outputs</h2>
            <ul className="space-y-1 text-xs text-gray-600">
              {["Weekly executive brief (PDF)", "Risk radar with severity ranking", "Recommendation register", "One-page board summary", "Ask panel — plain-English Q&A", "Audit trail of every AI decision", "Evidence-backed answers only", "Export Hub for all artifacts"].map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sectors */}
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Built For</h2>
          <div className="flex flex-wrap gap-2">
            {["Fintech and digital banking", "Investment management", "Professional services and consulting", "Technology and SaaS", "Manufacturing and supply chain", "Healthcare and clinical", "Real estate and construction", "Retail and D2C", "SME and owner-operated businesses", "GCC and Pakistan market leaders"].map((s, i) => (
              <span key={i} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">{s}</span>
            ))}
          </div>
        </div>

        {/* Pilot structure */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Pilot</p>
            <p className="text-2xl font-bold mb-1">$3k–$8k</p>
            <p className="text-xs text-gray-400 mb-3">per month / 90 days</p>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>Up to 5 active roles</li>
              <li>500 evidence records</li>
              <li>1 workspace</li>
              <li>Full support included</li>
              <li>No credit card for trial</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Growth</p>
            <p className="text-2xl font-bold mb-1">Per seat</p>
            <p className="text-xs text-gray-400 mb-3">monthly, post-pilot</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>Unlimited roles</li>
              <li>5,000 evidence records</li>
              <li>Up to 3 workspaces</li>
              <li>Team member access</li>
              <li>Connector integrations</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Enterprise</p>
            <p className="text-2xl font-bold mb-1">Custom</p>
            <p className="text-xs text-gray-400 mb-3">annual, negotiated</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>Unlimited everything</li>
              <li>Data residency options</li>
              <li>GCC/Pakistan infra connectors</li>
              <li>WhatsApp brief delivery</li>
              <li>Dedicated SLA</li>
            </ul>
          </div>
        </div>

        {/* Why NexusAI vs alternatives */}
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Why Not Generic AI Tools?</h2>
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Capability</th>
                  <th className="px-4 py-2 font-medium text-center">NexusAI</th>
                  <th className="px-4 py-2 font-medium text-center">ChatGPT Enterprise</th>
                  <th className="px-4 py-2 font-medium text-center">Traditional BI</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Evidence-grounded answers (your docs only)", "✓", "✗", "Partial"],
                  ["Role-aware briefs (CEO vs CFO vs CRO)", "✓", "✗", "✗"],
                  ["Sector-aware onboarding", "✓", "✗", "✗"],
                  ["Confidence scoring and source citation", "✓", "✗", "N/A"],
                  ["Human approval workflow for recommendations", "✓", "✗", "✗"],
                  ["GCC/Pakistan infrastructure connectors", "✓ (roadmap)", "✗", "Partial"],
                  ["WhatsApp brief delivery", "✓ (roadmap)", "✗", "✗"],
                  ["Audit trail for every AI action", "✓", "✗", "Partial"],
                ].map(([cap, nexus, chatgpt, bi], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-2 text-gray-700">{cap}</td>
                    <td className="px-4 py-2 text-center font-semibold text-green-700">{nexus}</td>
                    <td className="px-4 py-2 text-center text-gray-400">{chatgpt}</td>
                    <td className="px-4 py-2 text-center text-gray-400">{bi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Next steps */}
        <div className="mb-6 rounded-xl border-2 border-gray-900 p-6">
          <h2 className="mb-3 text-sm font-bold">Start a Pilot in 3 Steps</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="font-bold text-gray-900">1. Kickoff call</span><p className="mt-1 text-xs text-gray-500">30 minutes. We configure your workspace, select roles, and agree success criteria.</p></div>
            <div><span className="font-bold text-gray-900">2. First upload</span><p className="mt-1 text-xs text-gray-500">Upload 5 documents. Your first dashboard cards generate in minutes.</p></div>
            <div><span className="font-bold text-gray-900">3. First brief</span><p className="mt-1 text-xs text-gray-500">Within 24 hours you have a weekly executive brief ready to share with leadership.</p></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6 text-xs text-gray-400">
          <span>NexusAI Mission Control &bull; Leap Associates FZCO &bull; Confidential</span>
          <span>ali.janjua@live.com &bull; nexusai.io</span>
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
