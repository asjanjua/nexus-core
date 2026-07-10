"use client";

/**
 * /pilot/paperwork — Pilot Paperwork Pack (rendered)
 *
 * Surfaces the strategy-profile-driven pack from GET /api/pilot/paperwork as a
 * single print-ready, sendable document: SOW pre-fill, onboarding checklist,
 * success scorecard, billing trigger checklist, and value-proof pack.
 *
 * This is the conversion bridge: readiness -> strategy profile -> sendable pilot
 * pack. Two actions — "Save as PDF" (browser print) and "Copy as Markdown"
 * (paste into email or Word) — match the consulting send workflow.
 *
 * Auth: the API requires read:admin scope and resolves the workspace from the
 * caller's session only. A ?workspaceId= query param is ignored server-side
 * (see docs/SECURITY_REVIEW.md — 2026-07-06 auth-bypass sweep).
 */

import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types (mirror of GET /api/pilot/paperwork response)
// ---------------------------------------------------------------------------

type Paperwork = {
  workspaceId: string;
  workspaceName: string;
  generatedAt: string;
  buyerLane: string | null;
  sector: string | null;
  role: string | null;
  companySize: string | null;
  priority: string | null;
  governancePosture: string | null;
  readinessBand: string | null;
  sow: {
    clientName: string;
    sector: string;
    buyerLane: string | null;
    sponsor: { name: string; email: string };
    reviewer: { name: string; email: string };
    governancePosture: string | null;
    selectedWorkflow: string;
    pilotDuration: string;
    startDate: string;
  };
  onboardingChecklist: Array<{ step: number; title: string; done: boolean; detail: string | null }>;
  scorecard: {
    outcomes: Array<{ id: string; label: string; weight: number; day30: number | null; day60: number | null; day90: number | null }>;
    signOff: { sponsor: string; reviewer: string; date: string };
  };
  billingTriggers: Array<{ trigger: string; status: string }>;
  valueProof: {
    beforeState: string;
    nexusApproach: string;
    shadowRoiTarget: string;
    qualitativeSignals: string[];
    nextReviewDate: string;
  };
};

// ---------------------------------------------------------------------------
// Markdown serializer — for the "Copy as Markdown" action
// ---------------------------------------------------------------------------

function toMarkdown(p: Paperwork): string {
  const lines: string[] = [];
  lines.push(`# NexusAI Pilot Paperwork Pack`);
  lines.push(`**Client:** ${p.workspaceName}`);
  lines.push(`**Generated:** ${new Date(p.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`);
  lines.push(`**Buyer lane:** ${p.buyerLane ?? "Not set"}  ·  **Sector:** ${p.sector ?? "Not set"}  ·  **Readiness band:** ${p.readinessBand ?? "Not set"}`);
  lines.push("");

  lines.push(`## 1. Statement of Work (pre-fill)`);
  lines.push(`- Client: ${p.sow.clientName}`);
  lines.push(`- Sector: ${p.sow.sector}`);
  lines.push(`- Buyer lane: ${p.sow.buyerLane ?? "Not set"}`);
  lines.push(`- Sponsor: ${p.sow.sponsor.name} (${p.sow.sponsor.email})`);
  lines.push(`- Reviewer: ${p.sow.reviewer.name} (${p.sow.reviewer.email})`);
  lines.push(`- Governance posture: ${p.sow.governancePosture ?? "Not set"}`);
  lines.push(`- Selected workflow: ${p.sow.selectedWorkflow}`);
  lines.push(`- Pilot duration: ${p.sow.pilotDuration}`);
  lines.push(`- Start date: ${p.sow.startDate}`);
  lines.push("");

  lines.push(`## 2. Onboarding Checklist`);
  for (const item of p.onboardingChecklist) {
    lines.push(`${item.step}. [${item.done ? "x" : " "}] ${item.title}${item.detail ? ` — ${item.detail}` : ""}`);
  }
  lines.push("");

  lines.push(`## 3. Success Scorecard`);
  lines.push(`| Outcome | Weight | Day 30 | Day 60 | Day 90 |`);
  lines.push(`| --- | ---: | ---: | ---: | ---: |`);
  for (const o of p.scorecard.outcomes) {
    lines.push(`| ${o.label} | ${o.weight}% | ${o.day30 ?? "—"} | ${o.day60 ?? "—"} | ${o.day90 ?? "—"} |`);
  }
  lines.push(`Sign-off: ${p.scorecard.signOff.sponsor} (sponsor) / ${p.scorecard.signOff.reviewer} (reviewer) — ${p.scorecard.signOff.date}`);
  lines.push("");

  lines.push(`## 4. Billing Trigger Checklist`);
  for (const t of p.billingTriggers) {
    lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.trigger} (${t.status})`);
  }
  lines.push("");

  lines.push(`## 5. Value Proof Pack`);
  lines.push(`**Before state:** ${p.valueProof.beforeState}`);
  lines.push(`**Nexus approach:** ${p.valueProof.nexusApproach}`);
  lines.push(`**Shadow ROI target:** ${p.valueProof.shadowRoiTarget}`);
  lines.push(`**Qualitative signals:**`);
  for (const s of p.valueProof.qualitativeSignals) lines.push(`- ${s}`);
  lines.push(`**Next review date:** ${p.valueProof.nextReviewDate}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PilotPaperworkPage() {
  const [data, setData] = useState<Paperwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const workspaceId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("workspaceId") : null;
    const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    fetch(`/api/pilot/paperwork${qs}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok || !json.ok) {
          setError(json.error ?? `request_failed_${r.status}`);
          return;
        }
        setData(json.data as Paperwork);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const markdown = useMemo(() => (data ? toMarkdown(data) : ""), [data]);

  async function copyMarkdown() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-10 py-20 text-center text-sm text-gray-400">Generating pilot pack…</div>;
  }

  if (error === "no_strategy_profile") {
    return (
      <div className="mx-auto max-w-2xl px-10 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">No strategy profile yet</h1>
        <p className="mt-3 text-sm text-gray-600">
          The pilot pack is built from your strategy profile (buyer lane, sponsor, reviewer, selected workflow). Complete
          onboarding or the readiness assessment first, then return here.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/onboarding" className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700">Go to onboarding</a>
          <a href="/readiness" className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Readiness assessment</a>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-10 py-20 text-center text-sm text-gray-600">
        Could not load the pilot pack ({error ?? "unknown error"}). If you are not signed in, sign in and try again.
      </div>
    );
  }

  const p = data;
  const generated = new Date(p.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } } .no-print {}`}</style>

      {/* Controls */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <a href="/dashboard/ceo" className="text-sm text-gray-500 hover:text-gray-800">← Dashboard</a>
          <span className="text-gray-200">|</span>
          <span className="text-sm text-gray-500">Pilot Paperwork Pack — send to sponsor</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyMarkdown}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied ? "Copied ✓" : "Copy as Markdown"}
          </button>
          <button
            onClick={() => { if (typeof window !== "undefined") window.print(); }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save as PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 print:px-0 print:py-0">

        {/* Header */}
        <div className="mb-10 border-b-2 border-gray-900 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">NexusAI Mission Control</p>
          <h1 className="mt-1 text-2xl font-bold">Pilot Paperwork Pack</h1>
          <p className="mt-1 text-sm text-gray-500">{p.workspaceName} · Generated {generated}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {p.buyerLane && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Lane: {p.buyerLane}</span>}
            {p.sector && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Sector: {p.sector}</span>}
            {p.readinessBand && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Readiness: {p.readinessBand}</span>}
            {p.governancePosture && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Governance: {p.governancePosture}</span>}
            {p.priority && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Priority: {p.priority}</span>}
          </div>
        </div>

        {/* 1. SOW */}
        <Section n={1} title="Statement of Work (pre-fill)">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Client" value={p.sow.clientName} />
            <Field label="Sector" value={p.sow.sector} />
            <Field label="Buyer lane" value={p.sow.buyerLane ?? "Not set"} />
            <Field label="Selected workflow" value={p.sow.selectedWorkflow} />
            <Field label="Sponsor" value={`${p.sow.sponsor.name} · ${p.sow.sponsor.email}`} />
            <Field label="Reviewer" value={`${p.sow.reviewer.name} · ${p.sow.reviewer.email}`} />
            <Field label="Governance posture" value={p.sow.governancePosture ?? "Not set"} />
            <Field label="Pilot duration" value={p.sow.pilotDuration} />
            <Field label="Start date" value={p.sow.startDate} />
          </dl>
        </Section>

        {/* 2. Onboarding checklist */}
        <Section n={2} title="Onboarding Checklist">
          <ul className="space-y-2 text-sm">
            {p.onboardingChecklist.map((item) => (
              <li key={item.step} className="flex gap-3">
                <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border text-xs ${item.done ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-transparent"}`}>✓</span>
                <span>
                  <span className="font-semibold text-gray-900">{item.title}</span>
                  {item.detail && <span className="block text-xs text-gray-500">{item.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 3. Scorecard */}
        <Section n={3} title="Success Scorecard">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-2 font-semibold">Outcome</th>
                <th className="py-2 text-right font-semibold">Weight</th>
                <th className="py-2 text-right font-semibold">Day 30</th>
                <th className="py-2 text-right font-semibold">Day 60</th>
                <th className="py-2 text-right font-semibold">Day 90</th>
              </tr>
            </thead>
            <tbody>
              {p.scorecard.outcomes.map((o) => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{o.label}</td>
                  <td className="py-2 text-right text-gray-600">{o.weight}%</td>
                  <td className="py-2 text-right text-gray-400">{o.day30 ?? "—"}</td>
                  <td className="py-2 text-right text-gray-400">{o.day60 ?? "—"}</td>
                  <td className="py-2 text-right text-gray-400">{o.day90 ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            Sign-off: {p.scorecard.signOff.sponsor} (sponsor) / {p.scorecard.signOff.reviewer} (reviewer) · {p.scorecard.signOff.date}
          </p>
        </Section>

        {/* 4. Billing triggers */}
        <Section n={4} title="Billing Trigger Checklist">
          <ul className="space-y-2 text-sm">
            {p.billingTriggers.map((t, i) => (
              <li key={i} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-800">{t.trigger}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-500">{t.status}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 5. Value proof */}
        <Section n={5} title="Value Proof Pack">
          <div className="space-y-3 text-sm">
            <Field label="Before state" value={p.valueProof.beforeState} block />
            <Field label="Nexus approach" value={p.valueProof.nexusApproach} block />
            <Field label="Shadow ROI target" value={p.valueProof.shadowRoiTarget} block />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Qualitative signals</p>
              <ul className="mt-1 list-disc pl-5 text-gray-700">
                {p.valueProof.qualitativeSignals.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <Field label="Next review date" value={p.valueProof.nextReviewDate} block />
          </div>
        </Section>

        <div className="mt-12 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          NexusAI Mission Control · Leap Associates FZCO · Generated from strategy profile. Bracketed fields are placeholders to confirm before sending.
        </div>
      </div>
    </>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 print:mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">{n}</span>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
