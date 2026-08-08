"use client";

/**
 * Package a diligence review for the investment committee.
 *
 * THE REFUSALS ARE THE FEATURE. `/api/vantage/decision-handoff` enforces three
 * things the form deliberately does not pre-validate away:
 *
 *   a packet needs a named decision owner;
 *   a posture needs a named advisor behind it;
 *   a posture needs its material caveats.
 *
 * It would be easy to disable the button until every field is filled. That
 * would hide the governance rather than demonstrate it, and a buyer would
 * learn nothing about what the system refuses to do. So the request is allowed
 * to go and the refusal is rendered in the reviewer's language — which is also
 * the only way the audit record of a blocked attempt ever gets written.
 *
 * Vantage cannot mark a deal approved, investable, or rejected. Nothing here
 * decides anything; it attributes a human to what reaches the committee.
 */

import { useState } from "react";

const REFUSALS: Record<string, { title: string; body: string }> = {
  handoff_requires_deal_reference: {
    title: "The packet needs a deal reference",
    body: "Without one there is no way to tell later which deal this committee packet belonged to.",
  },
  handoff_requires_named_decision_owner: {
    title: "Name the person who owns this decision",
    body: "The investment committee decides, off-system. A packet with no named owner has nowhere to land, and 'who decided' stops being answerable.",
  },
  posture_requires_named_advisor: {
    title: "A posture needs the advisor behind it",
    body: "You have offered a recommendation posture with no named human. That is a machine opinion wearing a person's authority, and Vantage refuses to package it. Either name the advisor or send the packet with no posture at all.",
  },
  posture_requires_material_caveats: {
    title: "A posture needs its caveats",
    body: "A recommendation without the caveats behind it is the part of the judgment that gets quoted in the meeting and the part that gets forgotten.",
  },
};

type Result =
  | { kind: "idle" }
  | { kind: "blocked"; code: string }
  | { kind: "sent"; dealRef: string };

export function VantageDecisionHandoff() {
  const [dealRef, setDealRef] = useState("");
  const [decisionOwner, setDecisionOwner] = useState("");
  const [posture, setPosture] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [caveats, setCaveats] = useState("");
  const [openQuestions, setOpenQuestions] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function handoff() {
    setBusy(true);
    setResult({ kind: "idle" });
    try {
      const res = await fetch("/api/vantage/decision-handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "handoff",
          dealRef: dealRef.trim() || undefined,
          decisionOwner: decisionOwner.trim() || undefined,
          posture: posture.trim() || undefined,
          advisorName: advisorName.trim() || undefined,
          caveats: caveats.trim() || undefined,
          openQuestions: openQuestions
            .split("\n")
            .map((q) => q.trim())
            .filter(Boolean),
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setResult({ kind: "blocked", code: String(payload.error ?? `http_${res.status}`) });
        return;
      }
      setResult({ kind: "sent", dealRef: dealRef.trim() });
    } catch {
      setResult({ kind: "blocked", code: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-nexus-text placeholder:text-white/25 focus:border-[#D9834A]/60 focus:outline-none";
  const label = "text-xs uppercase tracking-wide text-nexus-muted";

  return (
    <div className="space-y-4">
      <section className="panel">
        <p className="panel-title">Committee packet</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="dealRef">Deal reference</label>
            <input id="dealRef" className={field} value={dealRef} onChange={(e) => setDealRef(e.target.value)} placeholder="Project Falcon" />
          </div>
          <div>
            <label className={label} htmlFor="owner">Decision owner at the IC</label>
            <input id="owner" className={field} value={decisionOwner} onChange={(e) => setDecisionOwner(e.target.value)} placeholder="Named human, not a committee" />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-nexus-warn/25 bg-nexus-warn/5 p-3">
          <p className="text-xs font-semibold text-nexus-warn">Optional: recommendation posture</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            Leave this empty to hand over evidence only. If you offer a posture, the advisor behind it
            and its caveats become mandatory — that is enforced by the API, not by this form.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <label className={label} htmlFor="posture">Posture</label>
              <input id="posture" className={field} value={posture} onChange={(e) => setPosture(e.target.value)} placeholder="e.g. proceed with conditions" />
            </div>
            <div>
              <label className={label} htmlFor="advisor">Advisor behind the posture</label>
              <input id="advisor" className={field} value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} placeholder="Named human" />
            </div>
          </div>
          <div className="mt-4">
            <label className={label} htmlFor="caveats">Material caveats</label>
            <textarea id="caveats" rows={3} className={field} value={caveats} onChange={(e) => setCaveats(e.target.value)} placeholder="What would change this view" />
          </div>
        </div>

        <div className="mt-4">
          <label className={label} htmlFor="questions">Open questions for the committee, one per line</label>
          <textarea id="questions" rows={3} className={field} value={openQuestions} onChange={(e) => setOpenQuestions(e.target.value)} placeholder="Leave empty to state explicitly that there are none" />
        </div>

        <button type="button" onClick={handoff} disabled={busy} className="btn-primary mt-4">
          {busy ? "Packaging…" : "Hand off to committee"}
        </button>
      </section>

      {result.kind === "blocked" && (
        <section className="panel border-nexus-danger/40" role="alert">
          <p className="text-sm font-semibold text-nexus-danger">
            {REFUSALS[result.code]?.title ?? "Handoff refused"}
          </p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            {REFUSALS[result.code]?.body ??
              "The packet was not accepted. The attempt has been recorded in the audit trail."}
          </p>
          <p className="mt-2 text-[11px] text-nexus-muted">Reason code: {result.code}</p>
        </section>
      )}

      {result.kind === "sent" && (
        <section className="panel border-nexus-accent/40">
          <p className="text-sm font-semibold text-nexus-accent">Packet recorded for {result.dealRef}</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            The handoff is in the audit trail with its named owner. Vantage has not approved, rejected,
            or recommended anything — the committee still decides.
          </p>
        </section>
      )}
    </div>
  );
}
