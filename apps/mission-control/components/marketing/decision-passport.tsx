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
  short: string;
  artifact: string;
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
    value: "6 documents · board pack, SBP EMI Regs 2019 Reg 5, onboarding SOP v4",
    short: "Source base locked",
    artifact: "Evidence bundle",
    tone: "text-nexus-sky",
    dot: "bg-nexus-sky",
    note: "Retrieved from the workspace. Nothing external, nothing invented.",
  },
  {
    key: "answer",
    label: "AI draft",
    field: "Draft finding",
    value: "Tier-2 onboarding exceeds the risk appetite set by the board in March.",
    short: "Draft clearly marked",
    artifact: "AI answer",
    // The one place violet is permitted: model-generated content.
    tone: "text-nexus-ai",
    dot: "bg-nexus-ai",
    note: "Marked as AI-generated. It is a draft, not a decision.",
  },
  {
    key: "caveat",
    label: "Caveat",
    field: "Confidence",
    value: "82% · agent-network channel unevidenced; flagged, not guessed",
    short: "Caveat preserved",
    artifact: "Risk note",
    tone: "text-nexus-warn",
    dot: "bg-nexus-warn",
    note: "Where evidence is thin, Nexus says so rather than filling the gap.",
  },
  {
    key: "owner",
    label: "Human owner",
    field: "Owner",
    value: "O. Haddad · Head of Risk · identity-bound reviewer seat",
    short: "Human authority attached",
    artifact: "Reviewer seat",
    tone: "text-nexus-text",
    dot: "bg-white/70",
    note: "A named person takes the decision. The seat is bound to an identity.",
  },
  {
    key: "gate",
    label: "Approval gate",
    field: "Approval",
    value: "Granted · consequence previewed before commit",
    short: "Gate opened by owner",
    artifact: "Approval record",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "The gate opens only with owner, evidence, and rationale all present.",
  },
  {
    key: "audit",
    label: "Audit trail",
    field: "Audit",
    value: "Immutable entry · who, what, when, on which evidence",
    short: "Write-once trail",
    artifact: "Audit entry",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "Written once. Not editable, by anyone, on any plan.",
  },
  {
    key: "export",
    label: "Export",
    field: "Passport",
    value: "PSP-2026-0714 · portable proof, regulator-ready",
    short: "Portable proof sealed",
    artifact: "Export pack",
    tone: "text-nexus-accent",
    dot: "bg-nexus-accent",
    note: "The decision leaves the system carrying its whole history.",
  },
];

const STEP_MS = 1600;
const FINAL_DWELL_MS = 2600;

export function DecisionPassport() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    timer.current = setTimeout(
      () => {
        setActive((i) => {
          if (i >= STAGES.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      },
      active >= STAGES.length - 1 ? FINAL_DWELL_MS : STEP_MS,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, playing, reduced]);

  const select = useCallback((i: number) => {
    setPlaying(false);
    setActive(i);
  }, []);

  const togglePlayback = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (active >= STAGES.length - 1) {
      setActive(0);
    }
    setPlaying(true);
  }, [active, playing]);

  const stage = STAGES[active];
  const progress = Math.round(((active + 1) / STAGES.length) * 100);
  const complete = active >= STAGES.length - 1;

  return (
    <div className="overflow-hidden rounded-lg border border-nexus-border bg-[linear-gradient(135deg,rgba(20,32,52,0.86),rgba(8,13,24,0.96)_48%,rgba(18,34,46,0.82))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="micro-label text-white/35">The decision passport</p>
          <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">
            One question. Seven checks. Portable proof.
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">
            The animation shows the proof object being assembled, not just the answer being
            generated. Each checkpoint adds authority before the export can leave.
          </p>
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={togglePlayback}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent"
          >
            {playing ? "Pause" : active >= STAGES.length - 1 ? "Replay" : "Play"}
          </button>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-white/40">
          <span className="micro-label">Assembly progress</span>
          <span>{progress}%</span>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Decision passport assembly progress"
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#8FC5FF,#F3C969_48%,#64D8C4)] transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
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
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.88fr]">
        {/* The passport: rows commit as each stage clears. */}
        <div className="rounded-lg border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="micro-label text-white/40">Decision passport</p>
              <p className="mt-1 text-[11px] text-white/35">PSP-2026-0714</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/40">
                {active + 1}/{STAGES.length}
              </span>
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
          </div>

          <dl className="mt-4 space-y-3">
            {STAGES.map((s, i) => {
              const committed = i <= active;
              return (
                <div
                  key={s.key}
                  className={[
                    "grid grid-cols-1 gap-1 rounded-md px-2 py-1.5 transition duration-500 motion-reduce:transition-none sm:grid-cols-[104px_1fr] sm:gap-3",
                    committed
                      ? i === active
                        ? "bg-white/[0.045] opacity-100"
                        : "opacity-100"
                      : "opacity-25",
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
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5">
          <div
            className={[
              "relative overflow-hidden rounded-lg border p-5 transition duration-500",
              complete
                ? "border-nexus-accent/35 bg-nexus-accent/[0.045]"
                : "border-white/10 bg-black/20",
            ].join(" ")}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(100,216,196,0.75),transparent)]"
            />
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="micro-label text-white/35">Current proof object</p>
                <p className={`mt-3 text-lg font-semibold ${stage.tone}`}>{stage.artifact}</p>
                <p className="mt-1 text-xs text-white/45">{stage.short}</p>
              </div>
              <div
                className={[
                  "grid h-20 w-20 shrink-0 place-items-center rounded-full border transition duration-500",
                  complete
                    ? "border-nexus-accent/45 bg-nexus-accent/10 shadow-[0_0_32px_rgba(100,216,196,0.16)]"
                    : "border-white/15 bg-white/[0.03]",
                ].join(" ")}
                aria-hidden
              >
                <div className="grid h-14 w-14 place-items-center rounded-full border border-white/15">
                  <span className={`text-xl font-semibold ${complete ? "text-nexus-accent" : stage.tone}`}>
                    {active + 1}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Evidence", "Authority", "Export"].map((label, i) => {
                const lit = active >= (i === 0 ? 0 : i === 1 ? 4 : 6);
                return (
                  <div
                    key={label}
                    className={[
                      "rounded-md border px-2 py-2 text-[11px] transition duration-300",
                      lit
                        ? "border-nexus-accent/25 bg-nexus-accent/[0.06] text-nexus-accent"
                        : "border-white/[0.08] bg-white/[0.025] text-white/35",
                    ].join(" ")}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-l border-white/10 pl-4">
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
            {complete && (
              <p className="mt-4 rounded-md border border-nexus-accent/25 bg-nexus-accent/[0.07] px-3 py-2 text-[11px] leading-5 text-nexus-accent">
                Export is available because every required proof row is present.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
