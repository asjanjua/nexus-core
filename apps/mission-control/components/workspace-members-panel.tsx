"use client";

/**
 * Workspace Members Panel — member list, invite, role management, and removal.
 *
 * Uses existing reviewer_seats table extended with member_role (migration 0047).
 * Roles: owner, admin, executive, reviewer, contributor, viewer.
 * Fetches from GET /api/workspace/members. Updates via PATCH/DELETE.
 */

import { useState, useEffect, useCallback } from "react";

const ROLES = ["owner", "admin", "executive", "reviewer", "contributor", "viewer"] as const;
type MemberRole = (typeof ROLES)[number];

interface Member {
  id: string;
  email: string;
  name: string | null;
  clerkUserId: string | null;
  memberRole: MemberRole;
  acceptedAt: string | null;
  approvalRole: string | null;
}

export function WorkspaceMembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/members");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setMembers(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const updateRole = async (seatId: string, memberRole: MemberRole) => {
    setUpdating(seatId);
    try {
      const res = await fetch(`/api/workspace/members/${seatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberRole }),
      });
      if (!res.ok) throw new Error("Failed");
      setMembers((prev) =>
        prev.map((m) => (m.id === seatId ? { ...m, memberRole } : m)),
      );
    } catch {
      setError("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const removeMember = async (seatId: string) => {
    if (!confirm("Revoke this member's access?")) return;
    setUpdating(seatId);
    try {
      const res = await fetch(`/api/workspace/members/${seatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setMembers((prev) => prev.filter((m) => m.id !== seatId));
    } catch {
      setError("Failed to revoke member");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Workspace Members</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          <a href="/reviewer-seat" className="btn-subtle text-xs">+ Invite</a>
        </div>
      </div>

      {error && (
        <div className="rounded border border-nexus-danger/30 bg-nexus-danger/10 px-3 py-2 text-xs text-nexus-danger">{error}</div>
      )}

      {members.length === 0 && !loading && (
        <div className="rounded border border-dashed border-white/15 bg-white/[0.025] p-4 text-xs text-white/40">
          No members yet. Invite your first team member from the Reviewer Seat page.
        </div>
      )}

      {members.length > 0 && (
        <div className="rounded border border-white/10 bg-white/[0.02] divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs text-white/80 truncate">{m.name ?? m.email}</p>
                {m.name && <p className="text-[10px] text-white/30">{m.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-white/70"
                  value={m.memberRole}
                  disabled={updating === m.id}
                  onChange={(e) => updateRole(m.id, e.target.value as MemberRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  className="text-[10px] text-nexus-danger/50 hover:text-nexus-danger disabled:opacity-30"
                  disabled={updating === m.id}
                  onClick={() => removeMember(m.id)}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
