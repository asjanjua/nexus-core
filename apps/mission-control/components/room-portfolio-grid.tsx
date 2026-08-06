"use client";

/**
 * Room Portfolio Grid — the interactive room activation surface.
 *
 * Every room card shows its template, current lifecycle state, owner, and
 * evidence scope. Active rooms are highlighted; staged rooms have an
 * Activate button that opens an inline form confirming the activation
 * contract (owner, scope, agent pack, boundary acknowledgement).
 *
 * The Executive Command room cannot be deactivated and has no activation
 * controls — it is always active.
 */

import { useState } from "react";
import {
  type NexusRoom,
  type ActivateRoomInput,
  ROOM_TEMPLATE_DEFAULTS,
  ROOM_LIFECYCLE_STATES,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  rooms: NexusRoom[];
  workspaceId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoomPortfolioGrid({ rooms, workspaceId }: Props) {
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Submit the activation form. */
  async function handleActivate(roomId: string, input: ActivateRoomInput) {
    setError(null);
    setActivating(roomId);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "activation_failed");
      }
      // Refresh the page so the server re-fetches with updated state.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "activation_failed");
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 px-4 py-3 text-sm text-nexus-danger">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            activating={activating === room.id}
            onActivate={(input) => handleActivate(room.id, input)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Card
// ---------------------------------------------------------------------------

function RoomCard({
  room,
  activating,
  onActivate,
}: {
  room: NexusRoom;
  activating: boolean;
  onActivate: (input: ActivateRoomInput) => void;
}) {
  const isActive = room.lifecycleState === "active";
  const isStaged = room.lifecycleState === "staged";
  const isExecutive = room.template === "executive";

  return (
    <div
      className={[
        "rounded-xl border p-5 transition-colors",
        isActive
          ? "border-nexus-accent/40 bg-nexus-accent/5"
          : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {room.displayName}
          </h3>
          <p className="mt-0.5 text-xs text-white/40">
            {ROOM_TEMPLATE_DEFAULTS[room.template]}
          </p>
        </div>
        <LifecycleBadge state={room.lifecycleState} />
      </div>

      {/* Owner & scope summary */}
      {isActive && room.ownerUserId && (
        <div className="mt-3 space-y-1 text-xs text-white/50">
          <p>
            <span className="text-white/30">Owner:</span>{" "}
            <span className="font-mono">{room.ownerUserId}</span>
          </p>
          {room.evidenceScope && (
            <p>
              <span className="text-white/30">Scope:</span>{" "}
              {room.evidenceScope}
            </p>
          )}
        </div>
      )}

      {/* Activation controls */}
      {isStaged && !isExecutive && (
        <ActivationForm
          room={room}
          activating={activating}
          onActivate={onActivate}
        />
      )}

      {/* CEO cannot be touched */}
      {isExecutive && (
        <p className="mt-3 text-xs text-white/30 italic">
          The Executive Command room is mandatory and always active.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activation Form (inline in the card)
// ---------------------------------------------------------------------------

function ActivationForm({
  room,
  activating,
  onActivate,
}: {
  room: NexusRoom;
  activating: boolean;
  onActivate: (input: ActivateRoomInput) => void;
}) {
  const [owner, setOwner] = useState("");
  const [scope, setScope] = useState("");
  const [agent, setAgent] = useState("default");
  const [acknowledged, setAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 w-full rounded-lg border border-nexus-accent/30 bg-nexus-accent/10 px-4 py-2 text-sm font-medium text-nexus-accent transition hover:bg-nexus-accent/20"
      >
        Activate this room
      </button>
    );
  }

  function submit() {
    if (!owner.trim()) return;
    onActivate({
      ownerUserId: owner.trim(),
      evidenceScope: scope.trim() || undefined,
      agentPack: agent || undefined,
      displayName: room.displayName,
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <label className="block">
        <span className="text-xs text-white/60">
          Accountable owner <span className="text-nexus-danger">*</span>
        </span>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Clerk user ID or email"
          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-nexus-accent/50 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-white/60">
          Evidence scope (what evidence this room needs)
        </span>
        <input
          type="text"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder='e.g. "Financial statements, board minutes" or "None yet — empty-state reason"'
          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-nexus-accent/50 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-white/60">Agent pack</span>
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-nexus-accent/50 focus:outline-none"
        >
          <option value="default">Default analyst pack</option>
          <option value="regulatory">Regulatory + compliance focus</option>
          <option value="financial">Financial analysis focus</option>
          <option value="operational">Operations + execution focus</option>
        </select>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 accent-nexus-accent"
        />
        <span className="text-xs leading-5 text-white/50">
          I confirm this room operates under the human-authority boundary:
          it may prepare and recommend, but never approve, sign, file, pay,
          or send externally without a named human decision.
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!owner.trim() || !acknowledged || activating}
          className="flex-1 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-black transition hover:bg-nexus-accent/90 disabled:opacity-40"
        >
          {activating ? "Activating…" : "Confirm activation"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle badge
// ---------------------------------------------------------------------------

function LifecycleBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    active: "border-nexus-accent/40 bg-nexus-accent/10 text-nexus-accent",
    staged: "border-nexus-sky/30 bg-nexus-sky/10 text-nexus-sky",
    inactive: "border-white/10 bg-white/5 text-white/40",
  };

  return (
    <span
      className={[
        "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        colors[state] ?? colors.inactive,
      ].join(" ")}
    >
      {state}
    </span>
  );
}
