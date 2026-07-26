"use client";

/**
 * The Decision Passport - Pinavia's signature marketing animation.
 *
 * Shows one regulated question travelling the governed path:
 *   Evidence -> AI draft -> Caveat -> Human owner -> Approval gate
 *   -> Audit trail -> Export
 *
 * Why this and not a cost graphic: competitors sell context economics
 * (cheaper tokens, better memory). Our claim is different and harder to
 * copy: a decision you can prove you were right to approve. This component
 * is that claim, animated.
 *
 * DESIGN CONSTRAINTS (locked system):
 * - Violet `nexus-ai` appears on the AI-draft step ONLY. Never elsewhere.
 * - Lime is brand-only and does not appear here at all (this is operating
 *   content, not brand chrome).
 * - Type ramp 12/14/16/20/24/32/40; spacing 4/8/12/16/24/32/48/64.
 *
 * ROBUSTNESS: every stage is present in the DOM from first paint. Animation
 * only adjusts opacity/transform. Nothing is gated behind scroll or JS
 * hydration, so a buyer on a poor connection still sees the full story.
 * `prefers-reduced-motion` renders the completed end state immediately.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Stage = {
  key: string;
  label: string;
  /** Passport row label once this stage completes. */
  field: string;
  value: string;
  /** Tailwind token class for this stage's accent. */
  tone: string;
  dot: string;
  note: string;
};

const STAGES: Stage[] = [
  {
    key: "evidence",
    label: "Evidence",
    field: "Sources",
    value: "6 documents - board pack, SBP EMI Regs 2019 Reg 5, onboarding SOP v4",
    tone: "text-nexus-sky",
    dot: "bg-nexus-sky",
    note: "Retrieved from the workspace. Nothing external, nothing invented.",
  },
  {
    key: "answer",
    label: "AI draft",
    field: "Draft finding",
    value: "Tier-2 onboarding exceeds the risk appetite set by the board in March.",
    // The one place violet is permitted: model-generated content.
    tone: "text-nexus-ai",
    dot: "bg-nexus-ai",
    note: "Marked as AI-generated. It is a draft, not a decision.",
  },
  {
    key: "caveat",
    label: "Caveat",
    field: "Confidence",
    value: "82% - agent-network channel unevidenced; flagged, not guessed",
    tone: "text-nexus-warn",
    dot: "bg-nexus-warn",
    note: "Where evidence is thin, Nexus says so rather than filling the gap.",
  },
  {
    key: "owner",
    label: "Human owner",
    field: "Owner",
    value: "O. Haddad - Head of Risk - identity-bound reviewer seat",
    tone: "text-nexus-text",
    dot: "bg-white/70",
    note: "A named person takes the decision. The seat is bound to an identity.",
  },
  {
    key: "gate",
    label: "Approval gate",
    field: "Approval",
    value: "Granted - consequence previewed before commit",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "The gate opens only with owner, evidence, and rationale all present.",
  },
  {
    key: "audit",
    label: "Audit trail",
    field: "Audit",
    value: "Immutable entry - who, what, when, on which evidence",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "Written once. Not editable, by anyone, on any plan.",
  },
  {
    key: "export",
    label: "Export",
    field: "Passport",
    value: "PSP-2026-0714 - portable proof, regulator-ready",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "The decision leaves the system carrying its whole history.",
  },
];

const STEP_MS = 1600;

export function DecisionPassport() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) {
        setReduced(true);
        setPlaying(false);
        setActive(STAGES.length - 1);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % STAGES.length);
    }, STEP_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, reduced]);

  const select = useCallback((i: number) => {
    setPlaying(false);
    setActive(i);
  }, []);

  const stage = STAGES[active];

  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-panel/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="micro-label text-white/35">The decision passport</p>
          <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">
            One question. Seven checks. Portable proof.
          </p>
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent"
          >
            {playing ? "Pause" : "Play"}
          </button>
        )}
      </div>

      {/* Step rail: every step always visible; only emphasis animates. */}
      <ol className="mt-8 flex flex-wrap gap-x-2 gap-y-3" aria-label="Governed decision path">
        {STAGES.map((s, i) => {
          const done = i <= active;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => select(i)}
                aria-current={i === active ? "step" : undefined}
                className={[
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition duration-200",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent",
                  i === active
                    ? "border-white/25 bg-white/[0.07] text-white"
                    : done
                      ? "border-white/10 text-white/55 hover:text-white/80"
                      : "border-white/[0.06] text-white/25 hover:text-white/50",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "h-1.5 w-1.5 rounded-full transition duration-300",
                    done ? s.dot : "bg-white/20",
                  ].join(" ")}
                />
                {s.label}
              </button>
              {i < STAGES.length - 1 && (
                <span aria-hidden className="text-white/15">
                  -&gt;
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        {/* The passport: rows commit as each stage clears. */}
        <div className="rounded-lg border border-white/10 bg-black/25 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="micro-label text-white/40">Decision passport</p>
            <span
              className={[
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition duration-300",
                active >= 4
                  ? "bg-nexus-accent/15 text-nexus-accent"
                  : "bg-white/[0.06] text-white/40",
              ].join(" ")}
            >
              {active >= 4 ? "Approved" : "In progress"}
            </span>
          </div>

          <dl className="mt-4 space-y-3">
            {STAGES.map((s, i) => {
              const committed = i <= active;
              return (
                <div
                  key={s.key}
                  className={[
                    "grid grid-cols-1 gap-1 transition duration-500 motion-reduce:transition-none sm:grid-cols-[104px_1fr] sm:gap-3",
                    committed ? "opacity-100" : "opacity-25",
                  ].join(" ")}
                >
                  <dt className="text-xs text-white/40">{s.field}</dt>
                  <dd
                    className={`break-words text-xs leading-5 ${committed ? s.tone : "text-white/30"}`}
                  >
                    {committed ? s.value : "pending"}
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="mt-5 border-t border-white/10 pt-3 text-[11px] leading-5 text-white/35">
            Every row is written once and travels with the decision. Remove any one of them and
            the export is refused.
          </p>
        </div>

        {/* Current-stage explainer. */}
        <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <span aria-hidden className={`h-2 w-2 rounded-full ${stage.dot}`} />
            <p className={`text-sm font-semibold ${stage.tone}`}>{stage.label}</p>
          </div>
          <p
            key={stage.key}
            className="mt-3 text-sm leading-6 text-white/65 motion-safe:animate-[fadeIn_240ms_ease-out]"
          >
            {stage.note}
          </p>
          {stage.key === "answer" && (
            <p className="mt-4 rounded-md border border-nexus-ai/30 bg-nexus-ai/10 px-3 py-2 text-[11px] leading-5 text-nexus-ai">
              Violet marks model-generated content everywhere in Pinavia. It is the one signal we
              never reuse for decoration.
            </p>
          )}
          {stage.key === "gate" && (
            <p className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-5 text-white/55">
              AI cannot open this gate. It cannot approve, sign, file, or certify; those verbs
              belong to a named human.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
