/**
 * Pinavia trial invite portal — staff only.
 *
 * Issue, copy, and revoke trial invite links. Fetch-only client page against
 * /api/admin/trial-invites, which enforces the platform-admin gate; nothing here
 * is trusted for authorisation, the UI just renders what the API allows.
 *
 * The generated link is shown once and copied by hand on purpose. Most of these
 * invites go out inside a WhatsApp or email thread the operator is already in,
 * which is also why email delivery is optional rather than the only path.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { TrialInvite } from "@/lib/contracts";

type Issued = { invite: TrialInvite; inviteCode: string; acceptUrl: string; emailSent: boolean };

const SECTORS = [
  { value: "", label: "No sample material" },
  { value: "financial_services", label: "Financial services" },
  { value: "professional_services", label: "Professional services" },
  { value: "technology_saas", label: "Technology / SaaS" },
];

const CARD = "rounded-lg border border-white/10 bg-white/[0.035] px-4 py-5 sm:px-5";
const INPUT =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none";
const FIELD_LABEL = "block text-xs font-medium uppercase tracking-wider text-white/50";

export default function TrialInvitePortalPage() {
  const [invites, setInvites] = useState<TrialInvite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [demoPack, setDemoPack] = useState("");
  const [trialDays, setTrialDays] = useState(30);

  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trial-invites");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        // A blanket 403 here is far more often an unset PINAVIA_ADMIN_PRINCIPALS
        // than a genuine authorisation decision, so say so rather than leaving an
        // operator to guess.
        setLoadError(
          body?.error === "platform_admin_required"
            ? "Your account is not on the Pinavia admin list. Check PINAVIA_ADMIN_PRINCIPALS includes your Clerk org or user id."
            : "Could not load invites."
        );
        setInvites([]);
        return;
      }
      const body = (await res.json()) as { invites?: TrialInvite[] };
      setInvites(body.invites ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Network error loading invites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function issue() {
    setIssuing(true);
    setFormError(null);
    setIssued(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/trial-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          company: company.trim() || undefined,
          note: note.trim() || undefined,
          demoPack: demoPack || undefined,
          trialDays,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFormError(
          body?.error === "invalid_request"
            ? "Check the email address and trial length."
            : "Could not issue the invite."
        );
        return;
      }
      setIssued((await res.json()) as Issued);
      setEmail("");
      setName("");
      setCompany("");
      setNote("");
      await load();
    } catch {
      setFormError("Network error issuing the invite.");
    } finally {
      setIssuing(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/trial-invites?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => {}
    );
    await load();
  }

  return (
    <PageShell
      title="Trial invites"
      description="Issue single-use trial links to named people. Each invite opens a private workspace on a time-boxed trial. Nothing is shared between invitees."
    >
      <div className="space-y-6">
        {/* Issue form */}
        <div className={CARD}>
          <h2 className="text-sm font-medium text-white">Issue an invite</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                className={`mt-1 ${INPUT}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@bank.com"
              />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-name">
                Name (optional)
              </label>
              <input
                id="invite-name"
                className={`mt-1 ${INPUT}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-company">
                Company (optional)
              </label>
              <input
                id="invite-company"
                className={`mt-1 ${INPUT}`}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-days">
                Trial length (days)
              </label>
              <input
                id="invite-days"
                className={`mt-1 ${INPUT}`}
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value) || 30)}
              />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-pack">
                Sample material
              </label>
              <select
                id="invite-pack"
                className={`mt-1 ${INPUT}`}
                value={demoPack}
                onChange={(e) => setDemoPack(e.target.value)}
              >
                {SECTORS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="invite-note">
                Internal note (optional)
              </label>
              <input
                id="invite-note"
                className={`mt-1 ${INPUT}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Which conversation this came out of"
              />
            </div>
          </div>

          {formError ? (
            <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {formError}
            </p>
          ) : null}

          <button
            className="btn-primary mt-4 text-sm disabled:opacity-60"
            onClick={issue}
            disabled={issuing || !email.trim()}
          >
            {issuing ? "Issuing…" : "Issue invite"}
          </button>
        </div>

        {/* One-time link. Shown once because only the hash is stored. */}
        {issued ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.07] px-4 py-5 sm:px-5">
            <p className="text-sm font-medium text-white">
              Invite issued for {issued.invite.email}
            </p>
            <p className="mt-1 text-xs leading-6 text-white/60">
              This link is shown once and cannot be recovered. Only its hash is stored.
              {issued.emailSent
                ? " It has also been emailed to them."
                : " Email delivery is not configured, so send it yourself."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="max-w-full overflow-x-auto rounded-md border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/80">
                {issued.acceptUrl}
              </code>
              <button
                className="btn-subtle text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(issued.acceptUrl).then(
                    () => setCopied(true),
                    () => setCopied(false)
                  );
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Issued invites */}
        <div className={CARD}>
          <h2 className="text-sm font-medium text-white">Issued invites</h2>
          {loadError ? (
            <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              {loadError}
            </p>
          ) : loading ? (
            <p className="mt-3 text-sm text-white/50">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No invites issued yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Who
                    </th>
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Status
                    </th>
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Trial
                    </th>
                    <th scope="col" className="pb-2 font-medium">
                      Link expires
                    </th>
                    <th scope="col" className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-b border-white/[0.06] align-top">
                      <td className="py-3 pr-4">
                        <span className="text-white">{invite.email}</span>
                        {invite.company ? (
                          <span className="block text-xs text-white/45">{invite.company}</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill status={invite.status} />
                      </td>
                      <td className="py-3 pr-4 text-white/70">{invite.trialDays} days</td>
                      <td className="py-3 text-white/55">
                        {new Date(invite.expiresAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        {invite.status === "invited" ? (
                          <button className="btn-subtle text-xs" onClick={() => void revoke(invite.id)}>
                            Revoke
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/** Status carries an icon-free label plus colour, so colour is never the only signal. */
function StatusPill({ status }: { status: TrialInvite["status"] }) {
  const styles: Record<TrialInvite["status"], string> = {
    invited: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    redeemed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    revoked: "border-white/15 bg-white/[0.04] text-white/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
