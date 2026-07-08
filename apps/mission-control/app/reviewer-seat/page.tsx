/**
 * Reviewer-seat admin surface (reviewer-seat slice 2 — management).
 *
 * The in-product home for the identity-bound reviewer:
 *   - invite a reviewer (email + optional name)
 *   - see the current bound reviewer and every seat's status
 *   - revoke a seat (with its consequence stated before commit)
 *
 * Complements /reviewer-seat/accept (the reviewer's redemption page). Wires to
 * GET/POST/DELETE /api/reviewer-seat. One live accepted seat per workspace in
 * V1: while a seat is accepted the invite form is closed until it is revoked.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { MetaChip } from "@/components/ui/nexus-primitives";

type Seat = {
  id: string;
  email: string;
  name: string | null;
  status: "invited" | "accepted" | "revoked";
  clerkUserId: string | null;
  invitedBy: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

type InviteResult = { email: string; acceptUrl: string; emailSent: boolean };

function StatusChip({ status }: { status: Seat["status"] }) {
  if (status === "accepted") return <MetaChip label="Accepted" tone="accent" />;
  if (status === "invited") return <MetaChip label="Invited" tone="warn" />;
  return <span className="badge badge-muted">Revoked</span>;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Human countdown to an invite's expiry, and whether it has lapsed. */
function expiry(iso: string): { text: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", expired: true };
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return { text: `Expires in ${days}d`, expired: false };
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return { text: `Expires in ${hours}h`, expired: false };
}

export default function ReviewerSeatAdminPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [accepted, setAccepted] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [resending, setResending] = useState<string | null>(null);
  const [resendResult, setResendResult] = useState<(InviteResult & { seatId: string }) | null>(null);
  const [resendCopied, setResendCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/reviewer-seat");
      const json = (await res.json()) as {
        ok: boolean;
        data?: { seats: Seat[]; acceptedSeat: Seat | null };
        error?: string;
      };
      if (json.ok && json.data) {
        setSeats(json.data.seats);
        setAccepted(json.data.acceptedSeat);
      } else {
        setLoadError("Could not load reviewer seats.");
      }
    } catch {
      setLoadError("Network error loading reviewer seats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite() {
    if (!email.trim()) {
      setInviteError("Enter the reviewer's email.");
      return;
    }
    setInviting(true);
    setInviteError(null);
    setInvite(null);
    setCopied(false);
    try {
      const res = await fetch("/api/reviewer-seat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { acceptUrl: string; emailSent: boolean };
        error?: string;
      };
      if (json.ok && json.data) {
        setInvite({ email: email.trim(), acceptUrl: json.data.acceptUrl, emailSent: json.data.emailSent });
        setEmail("");
        setName("");
        await load();
      } else if (json.error === "reviewer_seat_already_accepted") {
        setInviteError("A reviewer is already bound. Revoke the current reviewer before inviting another.");
      } else {
        setInviteError("Could not send the invite. Check the email and try again.");
      }
    } catch {
      setInviteError("Network error sending the invite.");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/reviewer-seat?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmRevoke(null);
        await load();
      }
    } finally {
      setRevoking(null);
    }
  }

  async function resend(seatId: string) {
    setResending(seatId);
    setResendResult(null);
    setResendCopied(false);
    try {
      const res = await fetch("/api/reviewer-seat/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { acceptUrl: string; emailSent: boolean } };
      if (json.ok && json.data) {
        setResendResult({ seatId, email: "", acceptUrl: json.data.acceptUrl, emailSent: json.data.emailSent });
        await load();
      }
    } finally {
      setResending(null);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const panel = "rounded-lg border border-nexus-border bg-nexus-panel p-4";

  return (
    <PageShell
      title="Reviewer seat"
      description="Invite the named reviewer who holds approval authority for this workspace's pilot recommendations. Approvals are bound to the reviewer's own identity."
    >
      {/* Current bound reviewer */}
      <div className={panel}>
        <p className="label">Current reviewer</p>
        {loading ? (
          <p className="mt-1 text-sm text-white/50">Loading…</p>
        ) : accepted ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{accepted.name ?? accepted.email}</p>
              <p className="mt-0.5 text-xs text-nexus-muted">
                {accepted.email} · accepted {fmt(accepted.acceptedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status="accepted" />
              {confirmRevoke === accepted.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-nexus-warn">
                    Revoking removes approval authority and drops pilot readiness.
                  </span>
                  <button
                    className="btn-secondary text-nexus-danger"
                    onClick={() => revoke(accepted.id)}
                    disabled={revoking === accepted.id}
                  >
                    {revoking === accepted.id ? "Revoking…" : "Confirm revoke"}
                  </button>
                  <button className="btn-secondary" onClick={() => setConfirmRevoke(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => setConfirmRevoke(accepted.id)}>
                  Revoke
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-white/60">
            No reviewer is bound yet. Invite one below. Until a reviewer accepts, this workspace
            is not pilot-ready and approvals fall back to break-glass only.
          </p>
        )}
      </div>

      {/* Invite form */}
      <div className={panel}>
        <p className="label">Invite a reviewer</p>
        {accepted ? (
          <p className="mt-1 text-sm text-white/60">
            One reviewer per workspace in this version. Revoke the current reviewer first to invite
            a different one.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="rs-email">Reviewer email</label>
                <input
                  id="rs-email"
                  className="input"
                  type="email"
                  placeholder="reviewer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="rs-name">Name (optional)</label>
                <input
                  id="rs-name"
                  className="input"
                  type="text"
                  placeholder="Omar Haddad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            {inviteError ? (
              <p className="rounded-md border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-sm text-nexus-danger">
                {inviteError}
              </p>
            ) : null}
            <button className="btn-primary" onClick={sendInvite} disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </button>

            {invite ? (
              <div className="rounded-lg border border-nexus-border bg-white/[0.02] p-3">
                <p className="text-sm text-white">
                  Invite created for <span className="font-semibold">{invite.email}</span>.{" "}
                  {invite.emailSent
                    ? "The accept link was emailed to them."
                    : "Email delivery is not configured here, so share the accept link manually."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="max-w-full truncate rounded bg-black/40 px-2 py-1 text-xs text-nexus-sky">
                    {invite.acceptUrl}
                  </code>
                  <button className="btn-secondary" onClick={() => copyLink(invite.acceptUrl)}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-nexus-muted">
                  This single-use link is shown once. It is not recoverable later — copy it now if
                  email was not sent.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Seat history */}
      <div className={panel}>
        <p className="label">Seat history</p>
        {loadError ? (
          <p className="mt-1 text-sm text-nexus-danger">{loadError}</p>
        ) : loading ? (
          <p className="mt-1 text-sm text-white/50">Loading…</p>
        ) : seats.length === 0 ? (
          <p className="mt-1 text-sm text-white/60">No seats yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5">
            {seats.map((seat) => {
              const exp = seat.status === "invited" ? expiry(seat.expiresAt) : null;
              return (
              <li key={seat.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">{seat.name ?? seat.email}</p>
                    <p className="mt-0.5 text-xs text-nexus-muted">
                      {seat.email} · invited {fmt(seat.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp ? (
                      <span className={`text-[11px] ${exp.expired ? "text-nexus-danger" : "text-nexus-muted"}`}>
                        {exp.text}
                      </span>
                    ) : null}
                    <StatusChip status={seat.status} />
                    {seat.status === "invited" ? (
                      <>
                        <button
                          className="btn-secondary"
                          onClick={() => resend(seat.id)}
                          disabled={resending === seat.id}
                        >
                          {resending === seat.id ? "Resending…" : exp?.expired ? "Resend (new link)" : "Resend"}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => revoke(seat.id)}
                          disabled={revoking === seat.id}
                        >
                          {revoking === seat.id ? "Revoking…" : "Revoke"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {resendResult?.seatId === seat.id ? (
                  <div className="mt-2 rounded-lg border border-nexus-border bg-white/[0.02] p-3">
                    <p className="text-xs text-white/70">
                      {resendResult.emailSent
                        ? "A fresh invite was emailed. The previous link no longer works."
                        : "New invite link generated (email not configured). The previous link no longer works — share this:"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="max-w-full truncate rounded bg-black/40 px-2 py-1 text-xs text-nexus-sky">
                        {resendResult.acceptUrl}
                      </code>
                      <button
                        className="btn-secondary"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(resendResult.acceptUrl);
                            setResendCopied(true);
                          } catch {
                            setResendCopied(false);
                          }
                        }}
                      >
                        {resendCopied ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
