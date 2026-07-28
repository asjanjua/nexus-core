"use client";

/**
 * Meridian Scope arc — the two Scope screens, sharing one persisted record.
 *
 * `screen="scope"`           -> /meridian/scope           (jurisdiction, regulator, licence, objective)
 * `screen="license-profile"` -> /meridian/license-profile (applicant, ownership, directors, activities)
 *
 * Both write to the same meridian_scope row. They are two screens because the
 * registry models them as two user tasks with different primary users
 * (compliance lead vs founder/CFO), not because they are two objects.
 *
 * BOUNDARY: this form records what the user declares. It does not evaluate,
 * conclude, or file. The requirement pack that a saved scope selects is shown
 * as a consequence preview before saving, so the user knows what changes.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MeridianLicenseStatus, MeridianScope } from "@/lib/contracts";
import { InfoHint, SkeletonLines } from "@/components/ui/nexus-primitives";

type ScreenKey = "scope" | "license-profile";

const LICENSE_STATUS: Array<{ value: MeridianLicenseStatus; label: string; hint: string }> = [
  { value: "not_licensed", label: "Not licensed", hint: "No permission held in this jurisdiction yet." },
  { value: "applicant", label: "Applicant", hint: "Application submitted or in preparation." },
  { value: "licensed", label: "Licensed", hint: "Permission held and in good standing." },
  { value: "variation", label: "Variation", hint: "Changing the scope of an existing permission." },
  { value: "renewal", label: "Renewal", hint: "Renewing an existing permission." },
];

type FormState = {
  jurisdiction: string;
  regulator: string;
  licenseType: string;
  licenseStatus: MeridianLicenseStatus;
  filingObjective: string;
  deadline: string;
  reviewerName: string;
  applicantName: string;
  ownershipPosture: string;
  directorsNote: string;
  regulatedActivities: string;
};

const EMPTY: FormState = {
  jurisdiction: "",
  regulator: "",
  licenseType: "",
  licenseStatus: "applicant",
  filingObjective: "",
  deadline: "",
  reviewerName: "",
  applicantName: "",
  ownershipPosture: "",
  directorsNote: "",
  regulatedActivities: "",
};

function fromScope(s: MeridianScope): FormState {
  return {
    jurisdiction: s.jurisdiction,
    regulator: s.regulator,
    licenseType: s.licenseType,
    licenseStatus: s.licenseStatus,
    filingObjective: s.filingObjective,
    deadline: s.deadline ?? "",
    reviewerName: s.reviewerName ?? "",
    applicantName: s.applicantName ?? "",
    ownershipPosture: s.ownershipPosture ?? "",
    directorsNote: s.directorsNote ?? "",
    regulatedActivities: s.regulatedActivities ?? "",
  };
}

export function MeridianScopeForm({ screen }: { screen: ScreenKey }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<MeridianScope | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meridian/scope")
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled || !payload.ok) return;
        if (payload.data.scope) {
          setSaved(payload.data.scope);
          setForm(fromScope(payload.data.scope));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meridian/scope", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Empty strings are absent values, not empty regulatory facts.
          deadline: form.deadline || null,
          reviewerName: form.reviewerName || null,
          applicantName: form.applicantName || null,
          ownershipPosture: form.ownershipPosture || null,
          directorsNote: form.directorsNote || null,
          regulatedActivities: form.regulatedActivities || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "save_failed");
      setSaved(payload.data.scope);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <SkeletonLines lines={5} />
      </section>
    );
  }

  const isScope = screen === "scope";
  const statusHint = LICENSE_STATUS.find((s) => s.value === form.licenseStatus)?.hint;

  return (
    <form onSubmit={submit} className="space-y-4">
      {saved && (
        <p className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 px-3 py-2 text-xs text-nexus-accent">
          Scope set for {saved.regulator} · {saved.licenseType}. Saving again updates the same
          record; there is one scope per workspace.
        </p>
      )}

      {isScope ? (
        <section className="panel space-y-4">
          <p className="panel-title">Regulatory scope</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="jurisdiction">
                Jurisdiction
              </label>
              <input
                id="jurisdiction"
                className="input"
                required
                maxLength={80}
                value={form.jurisdiction}
                onChange={(e) => set("jurisdiction", e.target.value)}
                placeholder="Pakistan"
              />
            </div>
            <div>
              <label className="label" htmlFor="regulator">
                Regulator
              </label>
              <input
                id="regulator"
                className="input"
                required
                maxLength={120}
                value={form.regulator}
                onChange={(e) => set("regulator", e.target.value)}
                placeholder="State Bank of Pakistan"
              />
            </div>
            <div>
              <label className="label" htmlFor="licenseType">
                Licence type
              </label>
              <input
                id="licenseType"
                className="input"
                required
                maxLength={120}
                value={form.licenseType}
                onChange={(e) => set("licenseType", e.target.value)}
                placeholder="Electronic Money Institution"
              />
            </div>
            <div>
              <label className="label" htmlFor="licenseStatus">
                Licence status
              </label>
              <select
                id="licenseStatus"
                className="input"
                value={form.licenseStatus}
                onChange={(e) => set("licenseStatus", e.target.value as MeridianLicenseStatus)}
              >
                {LICENSE_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {statusHint && <InfoHint text={statusHint} />}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="filingObjective">
              Filing objective
            </label>
            <textarea
              id="filingObjective"
              className="input min-h-20"
              required
              value={form.filingObjective}
              onChange={(e) => set("filingObjective", e.target.value)}
              placeholder="Vary the EMI licence to add agent-network onboarding."
            />
            <InfoHint text="What this submission is meant to achieve, in the words you would use with the regulator." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="deadline">
                Regulator deadline
              </label>
              <input
                id="deadline"
                type="date"
                className="input"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
              <InfoHint text="Optional. Drives the countdown on the Submission Room." />
            </div>
            <div>
              <label className="label" htmlFor="reviewerName">
                Intended reviewer
              </label>
              <input
                id="reviewerName"
                className="input"
                maxLength={160}
                value={form.reviewerName}
                onChange={(e) => set("reviewerName", e.target.value)}
                placeholder="O. Haddad, Head of Compliance"
              />
              <InfoHint text="A name here is an intention, not an approval. The reviewer becomes identity-bound at the pre-submission sign-off gate." />
            </div>
          </div>
        </section>
      ) : (
        <section className="panel space-y-4">
          <p className="panel-title">Licence profile</p>
          <p className="text-xs leading-5 text-white/45">
            Who is applying, and for what activity. These details appear in the submission memo and
            must match the entity named on the filing.
          </p>

          <div>
            <label className="label" htmlFor="applicantName">
              Applicant or licence holder
            </label>
            <input
              id="applicantName"
              className="input"
              maxLength={200}
              value={form.applicantName}
              onChange={(e) => set("applicantName", e.target.value)}
              placeholder="Qasr Pay (Private) Limited"
            />
          </div>
          <div>
            <label className="label" htmlFor="ownershipPosture">
              Ownership posture
            </label>
            <textarea
              id="ownershipPosture"
              className="input min-h-20"
              value={form.ownershipPosture}
              onChange={(e) => set("ownershipPosture", e.target.value)}
              placeholder="Shareholders above the disclosure threshold, ultimate beneficial owners, and any foreign holding."
            />
          </div>
          <div>
            <label className="label" htmlFor="directorsNote">
              Directors and sponsors
            </label>
            <textarea
              id="directorsNote"
              className="input min-h-20"
              value={form.directorsNote}
              onChange={(e) => set("directorsNote", e.target.value)}
              placeholder="Board composition and any fit-and-proper matters already known."
            />
            <InfoHint text="Record what is known. Meridian will flag what the evidence does not yet prove; it does not assess fitness." />
          </div>
          <div>
            <label className="label" htmlFor="regulatedActivities">
              Regulated activities
            </label>
            <textarea
              id="regulatedActivities"
              className="input min-h-20"
              value={form.regulatedActivities}
              onChange={(e) => set("regulatedActivities", e.target.value)}
              placeholder="Issuing e-money, merchant acquiring, agent network onboarding."
            />
          </div>
        </section>
      )}

      {/* Consequence preview — what saving changes, before it is saved. */}
      <section className="panel border-nexus-warn/25">
        <p className="panel-title text-nexus-warn">What saving does</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-white/60">
          <li>Selects the requirement pack the rest of the submission arc will use.</li>
          <li>Replaces the existing scope for this workspace. There is one scope per workspace.</li>
          <li>
            Records what you declared. It does not assess compliance, and it files nothing with{" "}
            {form.regulator || "the regulator"}.
          </li>
        </ul>
      </section>

      {error && <p className="panel text-sm text-nexus-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary disabled:opacity-40" disabled={saving}>
          {saving ? "Saving..." : saved ? "Update scope" : "Save scope"}
        </button>
        <Link href="/meridian" className="btn-subtle text-sm" prefetch={false}>
          Back to Submission Room
        </Link>
        {isScope ? (
          <Link href="/meridian/license-profile" className="text-xs text-nexus-sky hover:underline">
            Next: licence profile
          </Link>
        ) : (
          <Link href="/meridian/scope" className="text-xs text-nexus-sky hover:underline">
            Back: regulatory scope
          </Link>
        )}
      </div>
    </form>
  );
}
