"use client";

/**
 * Operating Pack Publish — release a deliverable to a partner's client.
 *
 * THE SUPPRESSION REFUSAL IS THE PRODUCT. Nucleus is sold to consulting firms
 * on a promise that sounds too good until you see it enforced: you may put
 * your brand on this, and you may not remove the trust layer. A firm can
 * change the logo, the accent, the typeface and the product name. It cannot
 * hide where a figure came from, the caveats attached to it, who reviewed it,
 * or that the work is auditable.
 *
 * `/api/nucleus/client-release` enforces exactly that, and until now there was
 * no way to press against it from the product. So the guarantee existed on
 * paper while the screen that would demonstrate it was labelled "planned".
 *
 * The toggles below therefore let a user ASK to hide protected elements. That
 * is deliberate. Removing the option would hide the boundary; offering it and
 * refusing it — visibly, and in the audit trail — is the boundary working. A
 * partner evaluating Nucleus should be able to try the thing they are worried
 * about and watch it be denied.
 */

import { useState } from "react";
import {
  PROTECTED_TRUST_ELEMENTS,
  PROTECTED_TRUST_ELEMENT_LABELS,
} from "@/lib/forbidden-actions";

type Result =
  | { kind: "idle" }
  | { kind: "refused"; code: string; detail?: string }
  | { kind: "released"; ref: string };

/** Brand-layer items a partner genuinely may change. */
const OVERRIDABLE = ["Logo", "Brand accent", "Typeface", "Client-facing product name"];

export function NucleusClientRelease() {
  const [engagementRef, setEngagementRef] = useState("");
  const [deliverableRef, setDeliverableRef] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [sourceCoverage, setSourceCoverage] = useState("");
  const [reviewerStatus, setReviewerStatus] = useState("");
  const [caveats, setCaveats] = useState("");
  const [caveatsAnswered, setCaveatsAnswered] = useState(false);
  const [suppress, setSuppress] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });

  function toggleSuppress(el: string) {
    setSuppress((prev) => (prev.includes(el) ? prev.filter((x) => x !== el) : [...prev, el]));
  }

  async function release() {
    setBusy(true);
    setResult({ kind: "idle" });
    try {
      const res = await fetch("/api/nucleus/client-release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "release_to_client",
          engagementRef: engagementRef.trim() || undefined,
          deliverableRef: deliverableRef.trim() || undefined,
          partnerName: partnerName.trim() || undefined,
          sourceCoverage: sourceCoverage.trim() || undefined,
          reviewerStatus: reviewerStatus.trim() || undefined,
          // Absent and empty are different answers. Only send the field once
          // the user has actually answered the question.
          unresolvedCaveats: caveatsAnswered
            ? caveats.split("\n").map((c) => c.trim()).filter(Boolean)
            : undefined,
          suppress,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        const raw = String(payload.error ?? `http_${res.status}`);
        setResult({ kind: "refused", code: raw.split(":")[0], detail: raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : undefined });
        return;
      }
      setResult({ kind: "released", ref: deliverableRef.trim() });
    } catch {
      setResult({ kind: "refused", code: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-nexus-text placeholder:text-white/25 focus:border-nexus-accent/60 focus:outline-none";
  const label = "text-xs uppercase tracking-wide text-nexus-muted";

  return (
    <div className="space-y-4">
      <section className="panel">
        <p className="panel-title">Deliverable</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="eng">Engagement reference</label>
            <input id="eng" className={field} value={engagementRef} onChange={(e) => setEngagementRef(e.target.value)} placeholder="ENG-2026-014" />
          </div>
          <div>
            <label className={label} htmlFor="del">Deliverable reference</label>
            <input id="del" className={field} value={deliverableRef} onChange={(e) => setDeliverableRef(e.target.value)} placeholder="Operating model review v3" />
          </div>
          <div>
            <label className={label} htmlFor="partner">Reviewing partner</label>
            <input id="partner" className={field} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Named human who takes responsibility" />
          </div>
          <div>
            <label className={label} htmlFor="reviewer">Reviewer status</label>
            <input id="reviewer" className={field} value={reviewerStatus} onChange={(e) => setReviewerStatus(e.target.value)} placeholder="e.g. reviewed in full, 2026-08-08" />
          </div>
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="coverage">Source coverage disclosed to the client</label>
          <textarea id="coverage" rows={2} className={field} value={sourceCoverage} onChange={(e) => setSourceCoverage(e.target.value)} placeholder="What the conclusions rest on, and what was out of scope" />
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="caveats">Unresolved caveats, one per line</label>
          <textarea id="caveats" rows={3} className={field} value={caveats} onChange={(e) => { setCaveats(e.target.value); setCaveatsAnswered(true); }} placeholder="Leave blank and tick below if there are genuinely none" />
          <label className="mt-2 flex items-center gap-2 text-xs text-nexus-muted">
            <input type="checkbox" checked={caveatsAnswered} onChange={(e) => setCaveatsAnswered(e.target.checked)} />
            {/* "We checked and there are none" must not look like "nobody
                looked". The API distinguishes an empty array from an absent
                field, so the UI has to make that an explicit choice. */}
            I have answered this — an empty list means none outstanding
          </label>
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Brand layer</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          Yours to change. None of these affect what the client can verify.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OVERRIDABLE.map((o) => (
            <span key={o} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-nexus-muted">
              {o}
            </span>
          ))}
        </div>
      </section>

      <section className="panel border-nexus-warn/30">
        <p className="panel-title text-nexus-warn">Trust layer</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          Contractually fixed. You may request suppression here and the release will be refused and
          recorded — that refusal is the guarantee Nucleus sells, so it is left switchable rather
          than hidden.
        </p>
        <div className="mt-3 space-y-2">
          {PROTECTED_TRUST_ELEMENTS.map((el) => (
            <label key={el} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={suppress.includes(el)}
                onChange={() => toggleSuppress(el)}
              />
              <span>
                <span className="text-sm text-nexus-text">Hide {el}</span>
                <span className="mt-0.5 block text-xs text-nexus-muted">
                  {PROTECTED_TRUST_ELEMENT_LABELS[el]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <button type="button" onClick={release} disabled={busy} className="btn-primary">
        {busy ? "Releasing…" : "Release to client"}
      </button>

      {result.kind === "refused" && (
        <section className="panel border-nexus-danger/40" role="alert">
          <p className="text-sm font-semibold text-nexus-danger">
            {result.code === "conceal_trust_mechanics"
              ? "Refused: the trust layer cannot be hidden"
              : result.code === "release_requires_named_partner"
                ? "Refused: name the reviewing partner"
                : result.code === "release_requires_disclosure"
                  ? "Refused: the client disclosure is incomplete"
                  : result.code === "release_requires_engagement_and_deliverable"
                    ? "Refused: the release needs an engagement and a deliverable"
                    : "Release refused"}
          </p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            {result.code === "conceal_trust_mechanics"
              ? "You asked to remove provenance, caveats, reviewer identity, or the audit label from client output. That is the concealment itself, not a display preference, and the attempt is now in the audit trail. Brand is yours; these are not."
              : result.code === "release_requires_named_partner"
                ? "Without a named partner the firm has not taken responsibility, and Nucleus becomes the de facto author of client advice."
                : result.code === "release_requires_disclosure"
                  ? `Missing: ${result.detail ?? "one or more disclosures"}. A client must be able to see what the work rests on, who reviewed it, and what is still open.`
                  : "The release was not accepted."}
          </p>
          <p className="mt-2 text-[11px] text-nexus-muted">Reason code: {result.code}</p>
        </section>
      )}

      {result.kind === "released" && (
        <section className="panel border-nexus-accent/40">
          <p className="text-sm font-semibold text-nexus-accent">Released: {result.ref}</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">
            Recorded with the named partner, the disclosure triple, and the full trust layer intact.
          </p>
        </section>
      )}
    </div>
  );
}
