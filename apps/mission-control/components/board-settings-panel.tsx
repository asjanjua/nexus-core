"use client";

/**
 * Board Settings Panel — Quorum board governance configuration.
 * Shows board profile (type, jurisdiction, schedule, officers)
 * and upcoming meetings. Wired into /settings/workspace.
 */

import { useState, useEffect, useCallback } from "react";

interface BoardProfile {
  id: string;
  boardType: string;
  jurisdiction: string;
  meetingSchedule: string | null;
  quorumRequirement: number;
  noticePeriodDays: number;
  chairpersonName: string | null;
  secretaryName: string | null;
  nextMeetingAt: string | null;
}

interface BoardMeeting {
  id: string;
  title: string;
  meetingDate: string;
  meetingNumber: number;
  attendeesCount: number;
  quorumMet: boolean;
  agendaStatus: string;
  minutesStatus: string;
  decisionsCount: number;
}

interface BoardMeetingsResponse {
  boardId: string;
  boardType: string;
  meetings: BoardMeeting[];
}

export function BoardSettingsPanel() {
  const [profile, setProfile] = useState<BoardProfile | null>(null);
  const [meetings, setMeetings] = useState<BoardMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/workspace/board-profile"),
        fetch("/api/workspace/board-meetings"),
      ]);
      const pJson = await pRes.json();
      const mJson = await mRes.json();
      if (pJson.ok) setProfile(pJson.data ?? pJson);
      if (mJson.ok) setMeetings(mJson.data ?? mJson);
    } catch {
      // non-critical panel
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  if (loading) {
    return (
      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/30 text-center">
        Loading board profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded border border-dashed border-white/15 bg-white/[0.025] p-4 text-xs text-white/40 text-center">
        No board configured.{' '}
        <span className="text-nexus-accent/70">Configure your board profile to enable Quorum governance.</span>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Board Governance</p>
        <span className="text-xs text-white/30 capitalize">{profile.boardType} board</span>
      </div>

      {/* Profile summary */}
      <div className="rounded border border-white/10 bg-white/[0.02] p-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-[10px] text-white/40">Jurisdiction</span>
        <span className="text-[10px] text-white/70 capitalize text-right">{profile.jurisdiction}</span>

        <span className="text-[10px] text-white/40">Schedule</span>
        <span className="text-[10px] text-white/70 capitalize text-right">
          {profile.meetingSchedule?.replace(/_/g, " ") ?? "Not set"}
        </span>

        <span className="text-[10px] text-white/40">Quorum</span>
        <span className="text-[10px] text-white/70 text-right">{profile.quorumRequirement} members</span>

        <span className="text-[10px] text-white/40">Notice</span>
        <span className="text-[10px] text-white/70 text-right">{profile.noticePeriodDays} days</span>

        {profile.chairpersonName && (
          <>
            <span className="text-[10px] text-white/40">Chairperson</span>
            <span className="text-[10px] text-white/70 text-right">{profile.chairpersonName}</span>
          </>
        )}

        {profile.secretaryName && (
          <>
            <span className="text-[10px] text-white/40">Secretary</span>
            <span className="text-[10px] text-white/70 text-right">{profile.secretaryName}</span>
          </>
        )}
      </div>

      {/* Meetings */}
      {meetings && meetings.meetings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/50">Recent Meetings</p>
          <div className="rounded border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {meetings.meetings.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-white/70 truncate">#{m.meetingNumber} — {m.title}</p>
                  <p className="text-[8px] text-white/30">
                    {new Date(m.meetingDate).toLocaleDateString()} · {m.attendeesCount} attendees
                    {m.quorumMet ? " · quorum met" : " · no quorum"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                    m.minutesStatus === "approved" || m.minutesStatus === "signed"
                      ? "bg-green-500/10 text-green-400"
                      : m.minutesStatus === "drafted" || m.minutesStatus === "circulated"
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-white/5 text-white/30"
                  }`}>
                    {m.minutesStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
