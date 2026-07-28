"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InfoHint } from "@/components/ui/nexus-primitives";

export type PilotHandoffItem = {
  label: string;
  detail: string;
  state: string;
  tone: "ready" | "review" | "warning" | "blocked" | "draft";
};

export type PilotHandoffConfig = {
  product: string;
  accentClass: string;
  accentTextClass: string;
  activeStep: number;
  steps: string[];
  eyebrow: string;
  title: string;
  description: string;
  workbenchTitle: string;
  items: PilotHandoffItem[];
  actionTitle: string;
  actionDescription: string;
  actionLabel: string;
  decisionTitle: string;
  decisionRationale: string;
  boundary: string;
  inputs: string[];
};

const TONE_CLASS: Record<PilotHandoffItem["tone"], string> = {
  ready: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  review: "border-sky-400/35 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  blocked: "border-red-400/40 bg-red-400/10 text-red-200",
  draft: "border-violet-400/35 bg-violet-400/10 text-violet-200",
};

function normalizedDate(value: string) {
  return value || "No deadline selected";
}

/**
 * Shared UI for design-final pilot handoff routes. It deliberately does not
 * persist a regulatory, board, or investment conclusion; the only action is
 * a prefilled route into the existing human-owned decision workflow.
 */
export function PilotHandoffWorkbench({ config }: { config: PilotHandoffConfig }) {
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  function handoff() {
    const rationale = [
      config.decisionRationale,
      owner ? `Proposed owner: ${owner}.` : "Owner still needs to be named.",
      `Target date: ${normalizedDate(deadline)}.`,
      reviewerNote ? `Reviewer note: ${reviewerNote}` : "No reviewer note supplied.",
      `Boundary: ${config.boundary}`,
    ].join("\n\n");
    router.push(
      `/decisions?prefill=${encodeURIComponent(config.decisionTitle)}&rationale=${encodeURIComponent(rationale.slice(0, 1200))}`
    );
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`micro-label ${config.accentTextClass}`}>{config.eyebrow}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{config.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{config.description}</p>
          </div>
          <div className="max-w-sm rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60">
            <p className={`font-semibold ${config.accentTextClass}`}>Human control</p>
            <p className="mt-1">{config.boundary}</p>
          </div>
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-4" aria-label={`${config.product} workflow stage`}>
          {config.steps.map((step, index) => {
            const active = index === config.activeStep;
            const complete = index < config.activeStep;
            return (
              <li
                key={step}
                className={[
                  "rounded-lg border px-3 py-2 text-sm",
                  active ? `${config.accentClass} text-white` : complete ? "border-white/15 bg-white/[0.04] text-white/65" : "border-white/[0.08] text-white/35",
                ].join(" ")}
              >
                <span className="mr-2 text-xs text-white/45">0{index + 1}</span>
                {step}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="panel">
          <div className="flex items-center gap-2">
            <p className="panel-title">{config.workbenchTitle}</p>
            <InfoHint text="These are review states for the current pilot handoff. They are not automatic legal, board, investment, or client conclusions." />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/35">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Review item</th>
                  <th className="pb-2 pr-4 font-medium">Evidence or context</th>
                  <th className="pb-2 text-right font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {config.items.map((item) => (
                  <tr key={item.label} className="border-b border-white/[0.07] last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">{item.label}</td>
                    <td className="py-3 pr-4 text-xs leading-5 text-white/55">{item.detail}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${TONE_CLASS[item.tone]}`}>{item.state}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel">
          <p className={`micro-label ${config.accentTextClass}`}>Next human action</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{config.actionTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{config.actionDescription}</p>
          <div className="mt-5 space-y-3">
            <label className="block text-xs text-white/55">
              Accountable owner
              <input className="input mt-1" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name the human owner" />
            </label>
            <label className="block text-xs text-white/55">
              Target date
              <input className="input mt-1" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </label>
            <label className="block text-xs text-white/55">
              Reviewer note
              <textarea className="input mt-1 min-h-[74px]" value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} placeholder="What must a named reviewer consider?" />
            </label>
          </div>
          <button type="button" onClick={handoff} className="btn-primary mt-5 w-full justify-center px-4 py-3 text-sm">
            {config.actionLabel}
          </button>
          <p className="mt-3 text-xs leading-5 text-white/40">This opens a decision draft. A human still sets the final owner, priority, and approval outcome.</p>
        </aside>
      </section>

      <section className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-4">
        <p className="micro-label text-nexus-warn">Authority boundary</p>
        <p className="mt-2 text-sm leading-6 text-amber-50/80">{config.boundary}</p>
        <p className="mt-3 text-xs text-white/50">Inputs used at this handoff: {config.inputs.join(" · ")}</p>
      </section>
    </div>
  );
}
