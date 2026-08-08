"use client";

/**
 * Advisor Judgment Log — who concluded what, when, and on what basis.
 *
 * The advisor-judgment-visible boundary requires that every posture identifies
 * the human, the caveats and the evidence. Until this existed that held only
 * at the moment of handoff, on a payload assembled in a form and never stored:
 * a firm could satisfy it at 4pm and have no record of the reasoning.
 *
 * APPEND-ONLY, VISIBLY. There is no edit control, because an editable log
 * cannot answer "what did the committee see". A changed view is recorded as a
 * new entry that supersedes its predecessor, and the superseded entry stays on
 * screen, struck through rather than removed — the change of mind is usually
 * the most informative thing in the log.
 *
 * The advisor field is never pre-filled with the signed-in user. The person
 * typing is frequently not the person whose judgment it is, and quietly
 * attributing it to whoever is at the keyboard is the exact misattribution the
 * boundary exists to prevent.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { VantageDeal, VantageJudgment } from "@/lib/contracts";
import { SkeletonLines } from "@/components/ui/nexus-primitives";

export function VantageJudgmentLog({ initialDealId }: { initialDealId?: string }) {
  const [deals, setDeals] = useState<VantageDeal[] | null>(null);
  const [dealId, setDealId] = useState(initialDealId ?? "");
  const [judgments, setJudgments] = useState<VantageJudgment[] | null>(null);
  const [subject, setSubject] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [position, setPosition] = useState("");
  const [caveats, setCaveats] = useState("");
  const [evidence, setEvidence] = useState("");
  const [supersedes, setSupersedes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/vantage/deals");
      const p = await res.json();
      const list = p.ok ? (p.data.deals as VantageDeal[]) : [];
      setDeals(list);
      if (!dealId && list.length > 0) setDealId(list[0].id);
    } catch {
      setDeals([]);
    }
  }, [dealId]);

  const loadJudgments = useCallback(async (id: string) => {
    if (!id) { setJudgments([]); return; }
    setJudgments(null);
    try {
      const res = await fetch(`/api/vantage/judgments?dealId=${encodeURIComponent(id)}`);
      const p = await res.json();
      setJudgments(p.ok ? (p.data.judgments as VantageJudgment[]) : []);
    } catch {
      setJudgments([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadDeals(); }, []);
  useEffect(() => { void loadJudgments(dealId); }, [dealId, loadJudgments]);

  async function record() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vantage/judgments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dealId,
          subject,
          advisor,
          position,
          caveats,
          evidenceRefs: evidence.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean),
          supersedes: supersedes ?? undefined,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.ok) { setError(String(p.error ?? `http_${res.status}`)); return; }
      setSubject(""); setPosition(""); setCaveats(""); setEvidence(""); setSupersedes(null);
      await loadJudgments(dealId);
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-nexus-text placeholder:text-white/25 focus:border-[#D9834A]/60 focus:outline-none";
  const label = "text-xs uppercase tracking-wide text-nexus-muted";
  const canRecord = Boolean(dealId && subject.trim() && advisor.trim() && position.trim());

  if (deals !== null && deals.length === 0) {
    return (
      <section className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
        <p className="text-sm font-semibold text-nexus-text">No deals to log against</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          A judgment belongs to a deal, so there is nothing to record yet.
        </p>
        <Link href="/vantage/dealroom" className="btn-primary mt-3 inline-flex" prefetch={false}>
          Set up a deal
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <label className={label} htmlFor="deal">Deal</label>
        <select id="deal" className={field} value={dealId} onChange={(e) => setDealId(e.target.value)}>
          {(deals ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </section>

      <section className="panel">
        <p className="panel-title">Record a judgment</p>
        {supersedes && (
          <p className="mt-2 rounded border border-nexus-warn/30 bg-nexus-warn/5 px-3 py-2 text-xs text-nexus-warn">
            This will supersede an earlier entry. The original stays in the log.{" "}
            <button type="button" className="underline" onClick={() => setSupersedes(null)}>Cancel</button>
          </p>
        )}
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="subject">Subject</label>
            <input id="subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Requirement, red flag, or theme" />
          </div>
          <div>
            <label className={label} htmlFor="advisor">Advisor</label>
            <input id="advisor" className={field} value={advisor} onChange={(e) => setAdvisor(e.target.value)} placeholder="Whose judgment this is" />
            <p className="mt-1 text-[11px] text-nexus-muted">Not pre-filled — the person typing is often not the advisor.</p>
          </div>
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="position">Position</label>
          <textarea id="position" rows={3} className={field} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="In their words. Not a proceed/stop dropdown — that would be the investment decision." />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="caveats">What would change this view</label>
            <textarea id="caveats" rows={2} className={field} value={caveats} onChange={(e) => setCaveats(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="evidence">Evidence ids</label>
            <textarea id="evidence" rows={2} className={field} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Space or comma separated" />
          </div>
        </div>
        <button type="button" onClick={record} disabled={busy || !canRecord} className="btn-primary mt-4">
          {busy ? "Recording…" : supersedes ? "Record revision" : "Record judgment"}
        </button>
        {error && (
          <p className="mt-3 text-xs text-nexus-danger">
            {error === "database_unavailable"
              ? "No database is reachable, so nothing was recorded."
              : error === "deal_archived"
                ? "This deal is archived. Judgments cannot be added to a closed scope."
                : `Not recorded: ${error}`}
          </p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">Log</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          Append-only. Superseded entries stay visible — the change of mind is usually the most
          informative thing here.
        </p>
        {judgments === null ? (
          <div className="mt-3"><SkeletonLines lines={3} /></div>
        ) : judgments.length === 0 ? (
          <p className="mt-2 text-xs text-nexus-muted">Nothing recorded for this deal yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {judgments.map((j) => {
              const superseded = Boolean(j.supersededBy);
              return (
                <div
                  key={j.id}
                  className={`rounded-lg border p-3 ${superseded ? "border-white/[0.07] bg-black/10" : "border-white/10 bg-black/20"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${superseded ? "text-nexus-muted line-through" : "text-nexus-text"}`}>
                      {j.subject}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {superseded && (
                        <span className="rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-nexus-muted">
                          superseded
                        </span>
                      )}
                      {!superseded && (
                        <button
                          type="button"
                          className="text-[11px] text-nexus-sky hover:underline"
                          onClick={() => { setSupersedes(j.id); setSubject(j.subject); setAdvisor(j.advisor); }}
                        >
                          Revise
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${superseded ? "text-nexus-muted" : "text-nexus-text"}`}>{j.position}</p>
                  {j.caveats && <p className="mt-2 text-xs leading-5 text-nexus-warn">Caveats: {j.caveats}</p>}
                  <p className="mt-2 text-[11px] text-nexus-muted">
                    {j.advisor} · {j.createdAt.slice(0, 10)}
                    {j.evidenceRefs.length > 0 ? ` · ${j.evidenceRefs.length} evidence ref${j.evidenceRefs.length === 1 ? "" : "s"}` : " · no evidence cited"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
