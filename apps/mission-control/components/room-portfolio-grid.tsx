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
import Link from "next/link";
import {
  type NexusRoom,
  type ActivateRoomInput,
  ROOM_TEMPLATE_DEFAULTS,
  PRODUCT_ROOM_TEMPLATES,
  type RoomTemplate,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Product-room vertical handoff data
// ---------------------------------------------------------------------------

/** Per-product-room activation guidance. The room gets activated here but the
 *  real setup happens in the vertical workflow's own screen. */
const PRODUCT_ROOM_HANDOFF: Record<string, {
  setupRoute: string;
  setupLabel: string;
  why: string;
  workflowArc: string;
}> = {
  board: {
    setupRoute: "/board",
    setupLabel: "Open Board Room",
    why: "Quorum needs board participants and a meeting record before it can assess governance completeness.",
    workflowArc: "Setup → Meeting → Record",
  },
  submission: {
    setupRoute: "/meridian/scope",
    setupLabel: "Set regulatory scope",
    why: "Meridian needs a jurisdiction, regulator, and licence type before it can select a requirement set.",
    workflowArc: "Scope → Evidence → Gap → Filing Pack",
  },
  deal: {
    setupRoute: "/vantage",
    setupLabel: "Open Deal Room",
    why: "Vantage needs a deal type and target profile before it can run diligence checks.",
    workflowArc: "Deal Room → Coverage → Red Flags → Memo",
  },
  engagement: {
    setupRoute: "/nucleus",
    setupLabel: "Open Engagement Room",
    why: "Nucleus needs a client profile and engagement scope before it can generate briefs.",
    workflowArc: "Profile → Brief → Review → Handoff",
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  rooms: NexusRoom[];
  _workspaceId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoomPortfolioGrid({ rooms, _workspaceId }: Props) {
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
  const isProduct = PRODUCT_ROOM_TEMPLATES.includes(room.template as RoomTemplate);
  const handoff = isProduct ? PRODUCT_ROOM_HANDOFF[room.template] : null;

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
            {isProduct && (
              <span className="ml-1.5 rounded bg-nexus-sky/10 px-1.5 py-0.5 text-[10px] text-nexus-sky/80">
                Product Room
              </span>
            )}
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
          {/* Activated-at timestamp and the user who performed the activation.
               Clerk user IDs have the format "user_<random>" — split on "_"
               and take the last segment (the actual ID). CEO room has no
               activatedBy (it is provisioned, not human-activated). */}
          {room.activatedAt && (
            <p>
              <span className="text-white/30">Activated:</span>{" "}
              {new Date(room.activatedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {room.activatedBy && (
                <span className="text-white/25">
                  {" "}by {room.activatedBy.split("_").pop()?.slice(0, 8) ?? room.activatedBy}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Product-room activation: handoff to vertical workflow */}
      {isStaged && isProduct && handoff && (
        <ProductRoomActivation
          room={room}
          handoff={handoff}
          activating={activating}
          onActivate={onActivate}
        />
      )}

      {/* Specialist-room activation: generic form */}
      {isStaged && !isProduct && !isExecutive && (
        <ActivationForm
          room={room}
          activating={activating}
          onActivate={onActivate}
        />
      )}

      {/* Product-room status after activation */}
      {isActive && isProduct && handoff && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-white/40">
            <span className="text-white/60">Workflow:</span>{" "}
            {handoff.workflowArc}
          </p>
          <Link
            href={handoff.setupRoute}
            prefetch={false}
            className="inline-block rounded-lg border border-nexus-accent/30 bg-nexus-accent/10 px-4 py-2 text-xs font-medium text-nexus-accent transition hover:bg-nexus-accent/20"
          >
            {handoff.setupLabel}
          </Link>
        </div>
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
// Product-Room Activation (vertical handoff)
// ---------------------------------------------------------------------------

/**
 * Product-room activation is lighter than the specialist-room form. The
 * administrator confirms the owner and boundary, then the primary action is
 * a link to the vertical workflow's setup screen — not a generic agent/scope
 * configuration. The room goes active here; the real setup is in the vertical.
 */
function ProductRoomActivation({
  room,
  handoff,
  activating,
  onActivate,
}: {
  room: NexusRoom;
  handoff: (typeof PRODUCT_ROOM_HANDOFF)[string];
  activating: boolean;
  onActivate: (input: ActivateRoomInput) => void;
}) {
  const [owner, setOwner] = useState("");
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
      displayName: room.displayName,
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs leading-5 text-white/50">{handoff.why}</p>

      <p className="text-xs text-white/40">
        Workflow: <span className="text-white/60">{handoff.workflowArc}</span>
      </p>

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

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 accent-nexus-accent"
        />
        <span className="text-xs leading-5 text-white/50">
          I confirm this product room operates under its vertical workflow&rsquo;s
          authority boundary — it may prepare and recommend, but never approve,
          sign, file, pay, certify, or send externally without a named human decision.
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!owner.trim() || !acknowledged || activating}
          className="flex-1 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-black transition hover:bg-nexus-accent/90 disabled:opacity-40"
        >
          {activating ? "Activating…" : "Activate"}
        </button>
        <Link
          href={handoff.setupRoute}
          prefetch={false}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:text-white"
        >
          {handoff.setupLabel}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="w-full text-xs text-white/30 hover:text-white/50"
      >
        Cancel
      </button>
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
