"use client";

/**
 * Engagement Intake — give a client assignment a scope.
 *
 * The partner field is optional here and mandatory at release. That asymmetry
 * is deliberate: work starts before a reviewing partner is assigned, and
 * forcing a name at intake would produce a placeholder that later looks like
 * accountability. The release endpoint refuses without one, so the gap is
 * closed at the point it matters rather than papered over at the start.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NucleusEngagement } from "@/lib/contracts";
import { SkeletonLines } from "@/components/ui/nexus-primitives";

const ARCS = [
  { value: "profile", label: "Profile" },
  { value: "package", label: "Package" },
  { value: "delivery", label: "Delivery" },
  { value: "assurance", label: "Assurance" },
] as const;

export function NucleusEngagementIntake() {
  const [items, setItems] = useState<NucleusEngagement[] | null>(null);
  const [reference, setReference] = useState("");
  const [clientName, setClientName] = useState("");
  const [methodArc, setMethodArc] = useState<(typeof ARCS)[number]["value"]>("profile");
  const [partner, setPartner] = useState("");
  const [scopeNote, setScopeNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/nucleus/engagements");
      const p = await res.json();
      setItems(p.ok ? (p.data.engagements as NucleusEngagement[]) : []);
    } catch { setItems([]); }
  }, []);

  // Mount-once. `load` calls setState; depending on it would loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/nucleus/engagements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, clientName, methodArc, partner: partner || null, scopeNote: scopeNote || null }),
      });
      const p = await res.json();
      if (!res.ok || !p.ok) { setError(String(p.error ?? `http_${res.status}`)); return; }
      setReference(""); setClientName(""); setPartner(""); setScopeNote("");
      await load();
    } catch { setError("network_error"); } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-nexus-text placeholder:text-white/25 focus:border-nexus-accent/60 focus:outline-none";
  const label = "text-xs uppercase tracking-wide text-nexus-muted";

  return (
    <div className="space-y-4">
      <section className="panel">
        <p className="panel-title">New engagement</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="ref">Firm reference</label>
            <input id="ref" className={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ENG-2026-014" />
          </div>
          <div>
            <label className={label} htmlFor="client">Client</label>
            <input id="client" className={field} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
          </div>
          <div>
            <label className={label} htmlFor="arc">Method arc</label>
            <select id="arc" className={field} value={methodArc} onChange={(e) => setMethodArc(e.target.value as typeof methodArc)}>
              {ARCS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="partner">Reviewing partner</label>
            <input id="partner" className={field} value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Can be assigned later" />
            <p className="mt-1 text-[11px] text-nexus-muted">
              Optional now, required before anything is released to the client.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="scope">Scope note</label>
          <textarea id="scope" rows={2} className={field} value={scopeNote} onChange={(e) => setScopeNote(e.target.value)} />
        </div>
        <button type="button" onClick={create} disabled={busy || !reference.trim() || !clientName.trim()} className="btn-primary mt-4">
          {busy ? "Creating…" : "Create engagement"}
        </button>
        {error && (
          <p className="mt-3 text-xs text-nexus-danger">
            {error === "database_unavailable" ? "No database is reachable, so nothing was saved." : `Not created: ${error}`}
          </p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">Engagements</p>
        {items === null ? (
          <div className="mt-3"><SkeletonLines lines={3} /></div>
        ) : items.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-nexus-muted">
            No engagements yet. Deliverables belong to an engagement, so start one above.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((e) => (
              <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-nexus-text">{e.reference} · {e.clientName}</p>
                  <p className="mt-1 text-[11px] text-nexus-muted">
                    {e.methodArc}
                    {e.partner ? ` · partner ${e.partner}` : " · no partner assigned yet"}
                  </p>
                </div>
                <Link href={`/nucleus/deliverable-builder?engagement=${encodeURIComponent(e.id)}`} className="btn-subtle shrink-0 text-xs" prefetch={false}>
                  Deliverables
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
