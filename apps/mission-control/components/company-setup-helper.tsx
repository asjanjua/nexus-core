"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nexus.company-setup-helper.dismissed";

const SETUP_STEPS = [
  {
    number: "01",
    title: "Describe your company",
    detail: "Confirm your sector, operating model, leadership roles, and the outcomes you want Nexus to improve.",
    href: "/onboarding",
    action: "Open company setup",
  },
  {
    number: "02",
    title: "Add a small evidence pack",
    detail: "Start with a board pack, operating review, strategy document, or meeting notes. Nexus keeps uncertain extraction out of executive outputs.",
    href: "/ingestion",
    action: "Add sources",
  },
  {
    number: "03",
    title: "Review what needs sign-off",
    detail: "Approve evidence that needs a human check before it becomes part of the governed intelligence base.",
    href: "/approvals",
    action: "Review approvals",
  },
  {
    number: "04",
    title: "Choose a first workflow",
    detail: "Use the Workflow Scorer to select one narrow, repeatable pilot before expanding to other teams or automations.",
    href: "/workflows",
    action: "Choose workflow",
  },
] as const;

/**
 * A lightweight first-run guide for authenticated workspaces. It deliberately
 * does not infer completion from client state: governed readiness remains
 * server-owned in the onboarding, approval, and workflow routes.
 */
export function CompanySetupHelper() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(STORAGE_KEY) !== "dismissed");
    setReady(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
    setOpen(false);
  }

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-5 z-40 rounded-full border border-nexus-accent/35 bg-[#101a2f] px-4 py-2 text-xs font-medium text-nexus-accent shadow-lg transition hover:border-nexus-accent hover:bg-nexus-accent/10"
        aria-label="Open company setup guide"
      >
        Set up company
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-setup-title"
            className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#0d1526] p-5 shadow-2xl sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nexus-accent">Company setup</p>
                <h2 id="company-setup-title" className="mt-2 text-xl font-semibold text-white">
                  Start with one trusted operating loop
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                  Nexus works best when it learns your company context, then turns a small, governed evidence pack into one useful recurring workflow.
                </p>
              </div>
              <button type="button" onClick={dismiss} className="text-sm text-white/45 hover:text-white" aria-label="Close setup guide">
                Close
              </button>
            </div>

            <ol className="mt-6 grid gap-3 sm:grid-cols-2">
              {SETUP_STEPS.map((step) => (
                <li key={step.number} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-nexus-accent">{step.number}</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 min-h-14 text-xs leading-5 text-white/55">{step.detail}</p>
                  <a href={step.href} className="mt-3 inline-flex text-xs font-medium text-nexus-accent hover:underline">
                    {step.action} →
                  </a>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-xs text-white/45">You can reopen this guide any time from the “Set up company” button.</p>
              <button type="button" onClick={dismiss} className="btn-subtle text-xs">
                I’ll do this later
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
