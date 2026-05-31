"use client";

/**
 * /readiness — AI-Native Readiness Assessment
 *
 * Public page, no login required. Seven dimensions scored 1–7.
 * Written for regulated and GCC consulting buyers.
 * Outputs a banded result and routes to the appropriate next step.
 *
 * Submission writes a lead record to the audit log via POST /api/readiness/submit.
 * No personal data collected without explicit opt-in.
 */

import { useState } from "react";

// ---------------------------------------------------------------------------
// Dimension definitions
// ---------------------------------------------------------------------------

const DIMENSIONS = [
  {
    id: "org_drag",
    label: "Organisational Drag",
    question:
      "When your leadership team has clear evidence that action is needed, how many approval steps does a typical decision pass through before someone acts?",
    hint: "Think about a recent strategic recommendation — from first insight to first action.",
    options: [
      { score: 1, text: "Seven or more steps. Decisions rarely reach action within a month." },
      { score: 3, text: "Four to six steps. Progress happens but takes two to four weeks." },
      { score: 5, text: "Two to three steps. A clear recommendation moves in under a week." },
      { score: 7, text: "One step or none. When the evidence is strong, leadership acts within 48 hours." },
    ],
  },
  {
    id: "ai_maturity",
    label: "AI as a Core Function",
    question:
      "Where does AI sit in your organisation today?",
    hint: "Not what you aspire to — what is actually true today.",
    options: [
      { score: 1, text: "No formal AI function. Individuals use tools on their own initiative." },
      { score: 3, text: "AI sits under IT as a set of tools to procure and manage." },
      { score: 5, text: "A dedicated AI or digital team exists but operates separately from the business." },
      { score: 7, text: "AI is embedded into core operations, reporting, and executive decision-making." },
    ],
  },
  {
    id: "data_readiness",
    label: "Data Readiness",
    question:
      "How accessible and governed is the business data your leaders actually need to make decisions?",
    hint: "Board packs, risk registers, financial reports, pipeline data — can an authorised person retrieve these in under an hour?",
    options: [
      { score: 1, text: "Data is scattered across systems, spreadsheets, and email inboxes." },
      { score: 3, text: "Key data is in systems but requires IT involvement to extract or consolidate." },
      { score: 5, text: "Most data is accessible but not consistently labelled, classified, or governed." },
      { score: 7, text: "Data is structured, classified, accessible to authorised users, and governed with clear retention and sensitivity rules." },
    ],
  },
  {
    id: "workflow_standardisation",
    label: "Workflow Standardisation",
    question:
      "How well-documented are your most critical business processes?",
    hint: "If your most experienced team member left tomorrow, how much operational knowledge would leave with them?",
    options: [
      { score: 1, text: "Most processes exist only in people's heads. Knowledge walks out when people do." },
      { score: 3, text: "Processes are informally documented but followed inconsistently." },
      { score: 5, text: "Key processes are documented and largely followed, with known exceptions." },
      { score: 7, text: "Core processes are fully documented, consistently followed, and periodically reviewed." },
    ],
  },
  {
    id: "governance_maturity",
    label: "Governance Maturity",
    question:
      "What is your current posture on AI governance and oversight?",
    hint: "Governance means knowing what the AI did, why, and how to undo it if it was wrong.",
    options: [
      { score: 1, text: "No AI policies or oversight frameworks are in place." },
      { score: 3, text: "Basic guidelines exist but there is no formal approval or audit process for AI outputs." },
      { score: 5, text: "AI outputs are reviewed before use and there is an approval process for high-stakes outputs." },
      { score: 7, text: "Full governance stack: audit trails, per-agent access controls, rollback capability, and board-level visibility into AI activity." },
    ],
  },
  {
    id: "regulatory_preparedness",
    label: "Regulatory Preparedness",
    question:
      "How prepared is your organisation to deploy AI within your regulatory environment?",
    hint: "A regulated sector (financial services, healthcare, government-linked) that has mapped its obligations is more ready, not less ready, than an unregulated company with no framework.",
    options: [
      { score: 1, text: "We have not assessed what regulations apply to our AI use." },
      { score: 3, text: "We know regulations apply but have not mapped them to AI deployment specifically." },
      { score: 5, text: "We have assessed regulatory requirements and have partial controls in place." },
      { score: 7, text: "We have a clear regulatory map, documented compliance controls, and an AI governance framework reviewed by compliance or legal." },
    ],
  },
  {
    id: "decision_velocity",
    label: "Decision Velocity",
    question:
      "When your leadership has the right intelligence, how quickly can your organisation translate it into a decision and a next action?",
    hint: "This is about execution speed once ambiguity is removed — not decision quality.",
    options: [
      { score: 1, text: "Decisions take weeks or months even when the information is clear and uncontested." },
      { score: 3, text: "Decisions typically take one to four weeks with multiple review rounds." },
      { score: 5, text: "Clear decisions move within a week. Contested ones take longer." },
      { score: 7, text: "Leadership acts within 48 hours when the evidence is strong and consensus exists." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Score bands
// ---------------------------------------------------------------------------

type Band = {
  label: string;
  range: string;
  colour: string;
  bg: string;
  border: string;
  headline: string;
  description: string;
  cta: string;
  ctaHref: string;
  ctaSecondary?: string;
  ctaSecondaryHref?: string;
};

const BANDS: Band[] = [
  {
    label: "Emerging",
    range: "7–20",
    colour: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    headline: "Strengthen the foundations before deploying AI intelligence.",
    description:
      "Your organisation has significant drag and data gaps that would limit the value of an AI intelligence layer. Deploying NexusAI now would surface good insights into a system that cannot act on them. The right first step is to reduce approval loops, improve data accessibility, and document at least two or three core workflows. We can help you map that work as a short advisory engagement before a pilot.",
    cta: "Book a foundations conversation",
    ctaHref: "mailto:ali.janjua@live.com?subject=NexusAI%20Foundations%20Conversation",
    ctaSecondary: "Read: reducing organisational drag",
    ctaSecondaryHref: "/product-brief",
  },
  {
    label: "Developing",
    range: "21–34",
    colour: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    headline: "Ready for a focused pilot on one workflow.",
    description:
      "Your organisation has the baseline capability to run a successful NexusAI pilot — but the scope needs to be disciplined. Start with a single workflow where the data is clean, the owner is motivated, and the outcome is measurable. A 90-day pilot scoped correctly will produce clear evidence of value and set the foundations for a broader deployment. We can help you choose that workflow.",
    cta: "Book a 30-minute scoping call",
    ctaHref: "mailto:ali.janjua@live.com?subject=NexusAI%20Pilot%20Scoping",
  },
  {
    label: "Advanced",
    range: "35–42",
    colour: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    headline: "Ready for a full NexusAI deployment.",
    description:
      "Your organisation has the data governance, workflow maturity, and decision velocity to absorb AI-native executive intelligence and act on it. A pilot can run across multiple functions simultaneously. The focus should be on which roles get the most immediate value and which connectors to prioritise first. We recommend starting the pilot within 30 days.",
    cta: "Request a pilot proposal",
    ctaHref: "mailto:ali.janjua@live.com?subject=NexusAI%20Pilot%20Proposal%20Request",
  },
  {
    label: "AI-Native",
    range: "43–49",
    colour: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    headline: "You are already operating at the frontier.",
    description:
      "Your organisation has the governance maturity, data infrastructure, and decision velocity to get the maximum value from NexusAI. The opportunity is not a pilot — it is a full deployment with a roadmap toward the intelligence compounding layer (learning loop, agent orchestration, shadow-mode ROI measurement). We can discuss an accelerated deployment path.",
    cta: "Discuss accelerated deployment",
    ctaHref: "mailto:ali.janjua@live.com?subject=NexusAI%20Accelerated%20Deployment",
  },
];

function getBand(total: number): Band {
  if (total <= 20) return BANDS[0];
  if (total <= 34) return BANDS[1];
  if (total <= 42) return BANDS[2];
  return BANDS[3];
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ScoreBar({ score, max = 7 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const colour =
    score <= 2 ? "bg-amber-400" : score <= 4 ? "bg-blue-400" : score <= 6 ? "bg-green-500" : "bg-purple-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all duration-500 ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-sm font-semibold text-gray-600">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ReadinessPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const answered = Object.keys(answers).length;
  const total = Object.values(answers).reduce((s, v) => s + v, 0);
  const avg = answered > 0 ? (total / answered).toFixed(1) : "—";
  const band = answered === DIMENSIONS.length ? getBand(total) : null;

  function selectOption(dimensionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [dimensionId]: score }));
  }

  async function handleSubmit() {
    if (answered < DIMENSIONS.length) return;
    setSubmitting(true);
    try {
      await fetch("/api/readiness/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: answers, total, band: band?.label, email: email || null }),
      });
    } catch {
      // non-blocking — audit write failure should not break the result
    }
    setSubmitting(false);
    setSubmitted(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Leap Associates FZCO · NexusAI
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">AI-Native Readiness Assessment</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Seven dimensions. Five minutes. A clear next step — not a marketing score.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">

        {/* Intro */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-5 text-sm text-gray-600 space-y-2">
          <p>
            This assessment is designed for leadership teams in regulated and institutional
            environments — financial services, professional services, technology, and industrial companies
            across GCC and South Asia.
          </p>
          <p>
            Answer based on where your organisation is today, not where you intend to be.
            The result routes you to a specific next step, not a generic score. Companies with
            heavy organisational drag are advised to address that first — deploying AI into a
            slow organisation makes it faster at the wrong things.
          </p>
          <p className="text-xs text-gray-400">
            This assessment provides directional guidance only. It does not constitute a regulatory,
            financial, or legal opinion.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{answered} of {DIMENSIONS.length} answered</span>
          <span>{DIMENSIONS.length - answered} remaining</span>
        </div>

        {/* Questions */}
        {DIMENSIONS.map((dim, idx) => {
          const selected = answers[dim.id];
          return (
            <div key={dim.id} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">{idx + 1}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{dim.label}</span>
                </div>
                <p className="text-base font-semibold text-gray-900 leading-snug">{dim.question}</p>
                {dim.hint && (
                  <p className="mt-1 text-xs text-gray-400 italic">{dim.hint}</p>
                )}
              </div>
              <div className="space-y-2">
                {dim.options.map((opt) => {
                  const isSelected = selected === opt.score;
                  return (
                    <button
                      key={opt.score}
                      type="button"
                      onClick={() => selectOption(dim.id, opt.score)}
                      className={[
                        "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                        isSelected
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <span className={`mr-2 text-xs font-bold ${isSelected ? "text-gray-300" : "text-gray-300"}`}>
                        {opt.score}/7
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Submit */}
        {!submitted && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {answered < DIMENSIONS.length && (
              <p className="text-sm text-amber-600">
                Answer all {DIMENSIONS.length} questions to see your result.
                {answered > 0 && ` ${DIMENSIONS.length - answered} remaining.`}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={answered < DIMENSIONS.length || submitting}
              className={[
                "rounded-lg px-6 py-3 text-sm font-semibold transition-all",
                answered === DIMENSIONS.length
                  ? "bg-gray-900 text-white hover:bg-gray-700 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? "Calculating..." : "See my result →"}
            </button>
          </div>
        )}

        {/* Results */}
        {submitted && band && (
          <div id="results" className={`rounded-xl border-2 ${band.border} ${band.bg} px-7 py-6 space-y-6`}>

            {/* Band headline */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-bold uppercase tracking-widest ${band.colour}`}>
                  {band.label}
                </span>
                <span className="text-xs text-gray-400">Overall score: {total} / 49 · Average: {avg} / 7</span>
              </div>
              <p className={`text-lg font-bold ${band.colour}`}>{band.headline}</p>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">{band.description}</p>
            </div>

            {/* Dimension breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Score by dimension</p>
              {DIMENSIONS.map((dim) => (
                <div key={dim.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{dim.label}</span>
                  </div>
                  <ScoreBar score={answers[dim.id] ?? 0} />
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">Recommended next step</p>
              <a
                href={band.ctaHref}
                className="inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                {band.cta}
              </a>
              {band.ctaSecondary && (
                <a
                  href={band.ctaSecondaryHref}
                  className="block text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
                >
                  {band.ctaSecondary}
                </a>
              )}
            </div>

            {/* Optional email */}
            {!emailSent && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Want a copy of this result to share with your team?
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={async () => {
                      if (!email) return;
                      await fetch("/api/readiness/submit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ scores: answers, total, band: band.label, email }),
                      });
                      setEmailSent(true);
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Send
                  </button>
                </div>
                {emailSent && <p className="text-xs text-green-600">Result recorded. We will follow up shortly.</p>}
              </div>
            )}

            {/* Restart */}
            <button
              onClick={() => { setAnswers({}); setSubmitted(false); setEmail(""); setEmailSent(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
            >
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        NexusAI Mission Control · Leap Associates FZCO · ali.janjua@live.com ·{" "}
        <a href="/privacy" className="underline hover:text-gray-600">Privacy</a>
      </div>
    </div>
  );
}
