"use client";

/**
 * Deal Room Setup — create and pick the diligence scope.
 *
 * Every other Vantage screen has run against "the workspace", as though a firm
 * only ever looks at one target at a time. This is where a deal gets a name,
 * a checklist and a committee date, so a finding can belong to something.
 *
 * NO STATUS CONTROL, and that is the point worth noticing. The obvious thing
 * to add here is approved / rejected / on hold. Vantage's registry boundary
 * forbids exactly that, so the field does not exist in the table either — see
 * migration 0055. Archive is a filing action, not a verdict.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { VantageDeal } from "@/lib/contracts";
import { SkeletonLines } from "@/components/ui/nexus-primitives";

export function VantageDealSetup() {
  const [deals, setDeals] = useState<VantageDeal[] | null>(null);
  const [name, setName] = useState("");
  const [dealType, setDealType] = useState<"fintech_ma" | "generic_ma">("fintech_ma");
  const [icDate, setIcDate] = useState("");
  const [lead, setLead] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vantage/deals");
      const payload = await res.json();
      setDeals(payload.ok ? (payload.data.deals as VantageDeal[]) : []);
    } catch {
      setDeals([]);
    }
  }, []);

  // Mount-once fetch. `load` is intentionally not a dependency: it calls
  // setState, so depending on it would re-run the effect after every load.
  // See docs/ENGINEERING_GUARDRAILS.md §10.1.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vantage/deals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          dealType,
          icDate: icDate || null,
          lead: lead || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(String(payload.error ?? `http_${res.status}`));
        return;
      }
      setName(""); setIcDate(""); setLead("");
      await load();
    } catch {
      setError("network_error");
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
        <p className="panel-title">New deal</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <label className={label} htmlFor="name">Deal name</label>
            <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Project Falcon" />
          </div>
          <div>
            <label className={label} htmlFor="lead">Diligence lead</label>
            <input id="lead" className={field} value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Accountable for the work, not the decision" />
          </div>
          <div>
            <label className={label} htmlFor="type">Checklist</label>
            <select id="type" className={field} value={dealType} onChange={(e) => setDealType(e.target.value as "fintech_ma" | "generic_ma")}>
              <option value="fintech_ma">Fintech M&amp;A</option>
              <option value="generic_ma">General M&amp;A</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ic">IC date</label>
            <input id="ic" type="date" className={field} value={icDate} onChange={(e) => setIcDate(e.target.value)} />
            {/* An absent date is honest. A default of "in 30 days" would be a
                fabricated committee deadline. */}
            <p className="mt-1 text-[11px] text-nexus-muted">Leave empty until a date is actually set.</p>
          </div>
        </div>
        <button type="button" onClick={create} disabled={busy || !name.trim()} className="btn-primary mt-4">
          {busy ? "Creating…" : "Create deal"}
        </button>
        {error && (
          <p className="mt-3 text-xs text-nexus-danger">
            {error === "database_unavailable"
              ? "No database is reachable, so the deal was not saved."
              : `Not created: ${error}`}
          </p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">Deals in this workspace</p>
        {deals === null ? (
          <div className="mt-3"><SkeletonLines lines={3} /></div>
        ) : deals.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-nexus-muted">
            No deals yet. Vantage screens run against a deal, so create one above and the diligence
            arc has something to attach findings to.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {deals.map((d) => (
              <div key={d.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-nexus-text">{d.name}</p>
                  <p className="mt-1 text-[11px] text-nexus-muted">
                    {d.dealType === "fintech_ma" ? "Fintech M&A" : "General M&A"}
                    {d.lead ? ` · lead ${d.lead}` : ""}
                    {d.icDate ? ` · IC ${d.icDate.slice(0, 10)}` : " · no IC date set"}
                  </p>
                </div>
                <Link
                  href={`/vantage/judgment-log?deal=${encodeURIComponent(d.id)}`}
                  className="btn-subtle shrink-0 text-xs"
                  prefetch={false}
                >
                  Judgment log
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel border-nexus-danger/30">
        <p className="panel-title text-nexus-danger">Authority boundary</p>
        <p className="mt-1 text-xs leading-5 text-nexus-muted">
          A deal has no approved, investable, or rejected state here, and the column does not exist
          in the database either. That lifecycle belongs to the investment committee.
        </p>
      </section>
    </div>
  );
}
