"use client";

import { useEffect, useState } from "react";
import { InfoHint, SkeletonLines } from "@/components/ui/nexus-primitives";

type WhiteLabelBrand = {
  logoUrl: string | null;
  accentColor: string | null;
  fontFamily: string | null;
};

type WorkspaceSettings = {
  name: string;
  whiteLabelBrand?: WhiteLabelBrand | null;
};

const DEFAULT_ACCENT = "#9AA6B8";
const TYPEFACE_OPTIONS = ["Inter", "Arial", "Georgia", "Helvetica Neue"];
const FIXED_TRUST_CONTROLS = [
  "Status colours and their meaning",
  "AI-drafted provenance labels",
  "Evidence citations and source coverage",
  "Named human approval boundaries",
  "Audit labels and consequence previews",
];

export function NucleusFirmProfile() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [firmName, setFirmName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/workspace")
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !payload.ok) return;
        const next = payload.data as WorkspaceSettings;
        const brand = next.whiteLabelBrand;
        setSettings(next);
        setFirmName(next.name ?? "");
        setLogoUrl(brand?.logoUrl ?? "");
        setAccentColor(brand?.accentColor ?? DEFAULT_ACCENT);
        setFontFamily(brand?.fontFamily ?? "Inter");
      })
      .catch(() => setError("We could not load the firm profile. Refresh and try again."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: firmName.trim(),
          whiteLabelBrand: {
            logoUrl: logoUrl.trim() || null,
            accentColor: accentColor || null,
            fontFamily: fontFamily || null,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error("save_failed");
      setSettings(payload.data as WorkspaceSettings);
      setSaved(true);
    } catch {
      setError("We could not save this brand layer. Check the logo URL and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="panel"><SkeletonLines lines={6} /></section>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="rounded-lg border border-[#9AA6B8]/30 bg-[#9AA6B8]/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C8D1DE]">Partner-facing brand layer</p>
        <p className="mt-1 text-xs leading-5 text-white/60">
          These choices apply to client-facing Nucleus presentation. They do not change what evidence means, who can approve, or what the audit trail records.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="panel space-y-4">
          <div>
            <p className="panel-title">Firm identity</p>
            <p className="mt-1 text-xs leading-5 text-white/45">Use the name your client sees on the engagement room and its controlled outputs.</p>
          </div>

          <div>
            <label className="label" htmlFor="firm-name">Firm name</label>
            <input id="firm-name" className="input" required minLength={2} maxLength={200} value={firmName} onChange={(event) => setFirmName(event.target.value)} placeholder="Northstar Advisory" />
          </div>

          <div>
            <label className="label" htmlFor="logo-url">Logo URL</label>
            <input id="logo-url" className="input" type="url" maxLength={1000} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://firm.example/logo.svg" />
            <InfoHint text="Optional. Use a secure HTTPS image URL. This replaces the client-facing logo only; Pinavia trust labels remain visible." />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_124px]">
            <div>
              <label className="label" htmlFor="typeface">Client-facing typeface</label>
              <select id="typeface" className="input" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                {TYPEFACE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <InfoHint text="A restrained type choice keeps shared evidence and approval patterns legible across partner deployments." />
            </div>
            <div>
              <label className="label" htmlFor="accent-colour">Accent</label>
              <input id="accent-colour" className="h-10 w-full cursor-pointer rounded border border-white/15 bg-transparent p-1" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} aria-label="Client-facing accent colour" />
            </div>
          </div>

          {saved && <p className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 px-3 py-2 text-xs text-nexus-accent">Firm brand saved. The protected trust layer is unchanged.</p>}
          {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary px-5 py-3" disabled={saving}>{saving ? "Saving firm brand..." : "Save firm brand"}</button>
            <span className="text-xs text-white/40">{settings?.whiteLabelBrand ? "Updates the existing brand layer." : "Creates the first brand layer for this workspace."}</span>
          </div>
        </section>

        <aside className="panel space-y-4" aria-label="Nucleus white-label contract">
          <div>
            <p className="panel-title">White-label contract</p>
            <p className="mt-1 text-xs leading-5 text-white/45">Your firm can own the presentation. The client must still be able to see how a conclusion was prepared and who is accountable.</p>
          </div>
          <div className="rounded-lg border border-[#9AA6B8]/30 bg-[#9AA6B8]/10 p-3">
            <p className="text-xs font-semibold text-[#C8D1DE]">Overridable here</p>
            <p className="mt-1 text-xs leading-5 text-white/60">Firm name, logo, accent colour, and client-facing typeface.</p>
          </div>
          <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-3">
            <p className="text-xs font-semibold text-nexus-warn">Contractually fixed</p>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-white/60">
              {FIXED_TRUST_CONTROLS.map((control) => <li key={control}>{control}</li>)}
            </ul>
          </div>
          <p className="text-xs leading-5 text-white/45">Nucleus can draft and organize work. A named partner remains responsible for recommendations, approvals, and client-facing conclusions.</p>
        </aside>
      </div>
    </form>
  );
}
