"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

const ALL_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", flag: "US" },
  { value: "openai", label: "OpenAI (GPT)", flag: "US" },
  { value: "azure_openai", label: "Azure OpenAI", flag: "US/EU" },
  { value: "deepseek", label: "DeepSeek", flag: "CN" },
  { value: "openai_compatible", label: "OpenAI-Compatible", flag: "Various" },
  { value: "local", label: "Local / On-Device", flag: "—" },
];

export default function PolicySettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [allowedProviders, setAllowedProviders] = useState<string[]>(["anthropic", "deepseek", "openai_compatible"]);
  const [localOnly, setLocalOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/workspace");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
        if (data.allowedProviders) setAllowedProviders(data.allowedProviders);
        if (typeof data.localOnlyMode === "boolean") setLocalOnly(data.localOnlyMode);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleProvider(provider: string) {
    setAllowedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedProviders, localOnlyMode: localOnly }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="AI Policy"
      description="Governance thresholds, approval rules, and outbound surface safety constraints."
    >
      {loading ? (
        <section className="panel space-y-4 text-sm text-white/60">
          <div className="animate-pulse h-4 w-48 bg-white/10 rounded" />
          <div className="animate-pulse h-4 w-64 bg-white/10 rounded" />
        </section>
      ) : (
        <div className="space-y-6">
          {/* Provider Allow-List */}
          <section className="panel space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">Allowed AI Providers</h3>
              <p className="text-sm text-white/60 mt-1">
                Select which providers can process this workspace&rsquo;s data. GCC and regulated buyers
                may wish to exclude providers hosted in certain jurisdictions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_PROVIDERS.map((p) => {
                const checked = allowedProviders.includes(p.value);
                return (
                  <label
                    key={p.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProvider(p.value)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-white">{p.label}</span>
                    </div>
                    <span className="text-xs text-white/40 font-mono">{p.flag}</span>
                  </label>
                );
              })}
            </div>

            {allowedProviders.length === 0 && (
              <p className="text-sm text-amber-400">
                No providers selected. AI features will be unavailable until at least one provider is
                allowed.
              </p>
            )}
          </section>

          {/* Thresholds */}
          <section className="panel space-y-2 text-sm text-white/80">
            <h3 className="text-base font-semibold text-white">Governance Thresholds</h3>
            <p>quarantine_threshold: 0.55</p>
            <p>recommendation_approval_required: true</p>
            <p>slack_restricted_payloads_blocked: true</p>
            <p>stale_data_banner_threshold_hours: 168</p>
            <p>canonical_promotion_requires_human_approval: true</p>
          </section>

          {/* Local-only mode */}
          <section className="panel space-y-3">
            <div>
              <h3 className="text-base font-semibold text-white">Local-Only Mode</h3>
              <p className="text-sm text-white/60 mt-1">
                When enabled, only local/on-device models are used. Cloud providers are blocked
                regardless of the allow-list above.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localOnly}
                onChange={(e) => {
                  setLocalOnly(e.target.checked);
                  setSaved(false);
                }}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-white">Local-Only Mode</span>
              {localOnly && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                  Active
                </span>
              )}
            </label>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Save Policy"}
            </button>
            {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </div>
      )}
    </PageShell>
  );
}
