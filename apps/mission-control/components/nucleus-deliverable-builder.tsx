"use client";

/**
 * Deliverable Builder — prepare what a client will eventually see.
 *
 * This screen does NOT release anything. Release goes through
 * /nucleus/publish, which refuses without a named partner and the complete
 * disclosure triple. A draft is allowed to be incomplete; a release is not,
 * and conflating the two would make the boundary negotiable.
 *
 * THE CAVEAT CONTROL IS THREE-STATE, matching the column and the API.
 * "Not answered" and "None outstanding" are different claims to a client, and
 * a checkbox that defaults to unchecked would silently assert the second. So
 * the control is an explicit radio: unanswered until somebody says otherwise.
 *
 * Readiness below is a description of what is missing, not a verdict. Nucleus
 * does not approve client advice — a named partner does.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NucleusDeliverable, NucleusEngagement } from "@/lib/contracts";
import { SkeletonLines } from "@/components/ui/nexus-primitives";

type CaveatState = "unanswered" | "none" | "some";

export function NucleusDeliverableBuilder({ initialEngagementId }: { initialEngagementId?: string }) {
  const [engagements, setEngagements] = useState<NucleusEngagement[] | null>(null);
  const [engagementId, setEngagementId] = useState(initialEngagementId ?? "");
  const [items, setItems] = useState<NucleusDeliverable[] | null>(null);

  const [title, setTitle] = useState("");
  const [sourceCoverage, setSourceCoverage] = useState("");
  const [reviewerStatus, setReviewerStatus] = useState("");
  const [caveatState, setCaveatState] = useState<CaveatState>("unanswered");
  const [caveats, setCaveats] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEngagements = useCallback(async () => {
    try {
      const res = await fetch("/api/nucleus/engagements");
      const p = await res.json();
      const list = p.ok ? (p.data.engagements as NucleusEngagement[]) : [];
      setEngagements(list);
      if (!engagementId && list.length > 0) setEngagementId(list[0].id);
    } catch { setEngagements([]); }
  }, [engagementId]);

  const loadDeliverables = useCallback(async (id: string) => {
    if (!id) { setItems([]); return; }
    setItems(null);
    try {
      const res = await fetch(`/api/nucleus/deliverables?engagementId=${encodeURIComponent(id)}`);
      const p = await res.json();
      setItems(p.ok ? (p.data.deliverables as NucleusDeliverable[]) : []);
    } catch { setItems([]); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadEngagements(); }, []);
  useEffect(() => { void loadDeliverables(engagementId); }, [engagementId, loadDeliverables]);

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/nucleus/deliverables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          engagementId,
          title,
          sourceCoverage: sourceCoverage || null,
          reviewerStatus: reviewerStatus || null,
          // Three states preserved exactly. `null` is an answer meaning
          // "nobody has looked"; [] means "checked, none".
          unresolvedCaveats:
            caveatState === "unanswered"
              ? null
              : caveatState === "none"
                ? []
                : caveats.split("\n").map((c) => c.trim()).filter(Boolean),
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.ok) { setError(String(p.error ?? `http_${res.status}`)); return; }
      setTitle(""); setSourceCoverage(""); setReviewerStatus(""); setCaveats(""); setCaveatState("unanswered");
      await loadDeliverables(engagementId);
    } catch { setError("network_error"); } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-nexus-text placeholder:text-white/25 focus:border-nexus-accent/60 focus:outline-none";
  const label = "text-xs uppercase tracking-wide text-nexus-muted";
  const engagement = (engagements ?? []).find((e) => e.id === engagementId);

  if (engagements !== null && engagements.length === 0) {
    return (
      <section className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
        <p className="text-sm font-semibold text-nexus-text">No engagements yet</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          A deliverable belongs to an engagement, so there is nothing to build against.
        </p>
        <Link href="/nucleus/engagement-intake" className="btn-primary mt-3 inline-flex" prefetch={false}>
          Start an engagement
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <label className={label} htmlFor="eng">Engagement</label>
        <select id="eng" className={field} value={engagementId} onChange={(e) => setEngagementId(e.target.value)}>
          {(engagements ?? []).map((e) => <option key={e.id} value={e.id}>{e.reference} · {e.clientName}</option>)}
        </select>
        {engagement && !engagement.partner && (
          <p className="mt-2 rounded border border-nexus-warn/30 bg-nexus-warn/5 px-3 py-2 text-xs text-nexus-warn">
            No reviewing partner assigned. Drafting is fine; release will be refused until one is named.
          </p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">New deliverable</p>
        <div className="mt-3">
          <label className={label} htmlFor="title">Title</label>
          <input id="title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Operating model review v3" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="cov">Source coverage</label>
            <textarea id="cov" rows={2} className={field} value={sourceCoverage} onChange={(e) => setSourceCoverage(e.target.value)} placeholder="What the conclusions rest on, and what was out of scope" />
          </div>
          <div>
            <label className={label} htmlFor="rev">Reviewer status</label>
            <textarea id="rev" rows={2} className={field} value={reviewerStatus} onChange={(e) => setReviewerStatus(e.target.value)} placeholder="e.g. reviewed in full, 2026-08-08" />
          </div>
        </div>

        <fieldset className="mt-4 rounded-lg border border-white/10 p-3">
          <legend className={`px-1 ${label}`}>Unresolved caveats</legend>
          {/* Radio, not a checkbox. An unchecked box would silently assert
              "none outstanding" for a deliverable nobody has reviewed. */}
          {([
            ["unanswered", "Not answered yet", "Nobody has reviewed this for caveats."],
            ["none", "None outstanding", "Checked, and there are none. This is a positive assurance."],
            ["some", "There are caveats", "Listed below and shown to the client."],
          ] as const).map(([value, name, hint]) => (
            <label key={value} className="mt-2 flex items-start gap-2">
              <input type="radio" name="caveats" className="mt-1" checked={caveatState === value} onChange={() => setCaveatState(value)} />
              <span>
                <span className="text-sm text-nexus-text">{name}</span>
                <span className="mt-0.5 block text-[11px] text-nexus-muted">{hint}</span>
              </span>
            </label>
          ))}
          {caveatState === "some" && (
            <textarea rows={3} className={field} value={caveats} onChange={(e) => setCaveats(e.target.value)} placeholder="One caveat per line" />
          )}
        </fieldset>

        <button type="button" onClick={save} disabled={busy || !title.trim() || !engagementId} className="btn-primary mt-4">
          {busy ? "Saving…" : "Save draft"}
        </button>
        {error && (
          <p className="mt-3 text-xs text-nexus-danger">
            {error === "database_unavailable" ? "No database is reachable, so nothing was saved." : `Not saved: ${error}`}
          </p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">Drafts</p>
        {items === null ? (
          <div className="mt-3"><SkeletonLines lines={3} /></div>
        ) : items.length === 0 ? (
          <p className="mt-2 text-xs text-nexus-muted">Nothing drafted for this engagement yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((d) => {
              const missing: string[] = [];
              if (!d.sourceCoverage) missing.push("source coverage");
              if (!d.reviewerStatus) missing.push("reviewer status");
              if (d.unresolvedCaveats === null) missing.push("caveats");
              if (!engagement?.partner) missing.push("reviewing partner");
              return (
                <div key={d.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-nexus-text">{d.title}</p>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] ${
                      d.releasedAt
                        ? "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent"
                        : missing.length === 0
                          ? "border-nexus-sky/30 bg-nexus-sky/10 text-nexus-sky"
                          : "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn"
                    }`}>
                      {d.releasedAt ? "released" : missing.length === 0 ? "ready to release" : `${missing.length} missing`}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-nexus-muted">
                    {/* A description of what is absent, not a verdict on the
                        work. Nucleus does not approve client advice. */}
                    {missing.length === 0
                      ? "Disclosure complete and a partner is named. A human still decides whether to release."
                      : `Cannot be released until: ${missing.join(", ")}.`}
                  </p>
                  <p className="mt-1 text-[11px] text-nexus-muted">
                    Caveats:{" "}
                    {d.unresolvedCaveats === null
                      ? "not answered"
                      : d.unresolvedCaveats.length === 0
                        ? "none outstanding"
                        : `${d.unresolvedCaveats.length} listed`}
                  </p>
                </div>
              );
            })}
            <Link href="/nucleus/publish" className="btn-subtle mt-2 inline-flex text-xs" prefetch={false}>
              Go to release
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
