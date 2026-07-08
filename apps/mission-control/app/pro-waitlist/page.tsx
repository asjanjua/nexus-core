/**
 * Pro waitlist page (migration 0037).
 *
 * Launch is free; Pro pricing is shown and intent is captured here instead of a
 * Stripe checkout (checkout follows post-launch). Authenticated: intent binds to
 * the caller's workspace. Wires to GET/POST /api/waitlist.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type Entry = { email: string; name: string | null; note: string | null; updatedAt: string } | null;

const PRO_PRICE = "$499 / mo";
const PRO_FEATURES = [
  "Scheduled executive synthesis briefs",
  "Exports (weekly brief, one-pager, pilot pack)",
  "Higher evidence limits and token budget",
  "API access for agents and integrations",
];

export default function ProWaitlistPage() {
  const [entry, setEntry] = useState<Entry>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist");
      const json = (await res.json()) as { ok: boolean; data?: { joined: boolean; entry: Entry } };
      if (json.ok && json.data) {
        setJoined(json.data.joined);
        setEntry(json.data.entry);
        if (json.data.entry) {
          setEmail(json.data.entry.email);
          setName(json.data.entry.name ?? "");
          setNote(json.data.entry.note ?? "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    if (!email.trim()) {
      setError("Enter an email so we can reach you about Pro.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, note: note.trim() || undefined }),
      });
      if (res.ok) await load();
      else setError("Could not record your interest. Check the email and try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const panel = "rounded-lg border border-nexus-border bg-nexus-panel p-4";

  return (
    <PageShell
      title="Nexus Pro"
      description="Pro is coming after launch. Register your interest now and we will reach out to set it up. No payment is taken today."
    >
      <div className={panel}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white">Pro plan</p>
          <p className="text-2xl font-bold text-white">{PRO_PRICE}</p>
        </div>
        <ul className="mt-3 space-y-1.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="text-sm text-white/70">• {f}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-nexus-muted">
          Billing is invoiced for pilots during launch. Self-serve checkout arrives after launch.
        </p>
      </div>

      <div className={panel}>
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : joined ? (
          <div>
            <p className="text-sm font-medium text-nexus-accent">You are on the Pro waitlist.</p>
            <p className="mt-2 text-sm text-white/60">
              Registered as {entry?.email}
              {entry?.updatedAt ? ` · ${new Date(entry.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}.
              You can update your details below.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/70">
            Register your interest in Pro. We will contact you to set up a pilot or Pro plan.
          </p>
        )}

        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pw-email">Work email</label>
              <input id="pw-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label className="label" htmlFor="pw-name">Name (optional)</label>
              <input id="pw-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Janjua" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pw-note">What do you want Pro for? (optional)</label>
            <textarea id="pw-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Team size, workflows, timeline" />
          </div>
          {error ? (
            <p className="rounded-md border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-sm text-nexus-danger">{error}</p>
          ) : null}
          <button className="btn-primary" onClick={join} disabled={busy}>
            {busy ? "Saving…" : joined ? "Update my details" : "Join the Pro waitlist"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
