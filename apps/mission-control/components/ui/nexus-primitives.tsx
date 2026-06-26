/**
 * Shared NexusAI command-center primitives — locked design system.
 *
 * Promoted out of components/dashboard-panel.tsx (the original Executive
 * Room build) so every guided-route screen (Ask, Approvals, Recommendations,
 * Decisions, Sources, Export Hub, ...) reuses one source instead of
 * reimplementing KPI heroes, status pills, and the violet AI marker pattern
 * per screen. See nexus-design-system skill for the full token/spacing/
 * component-recipe spec — these primitives are the Tailwind implementation
 * of that spec and should not diverge from it.
 *
 * Discipline reminder baked into AiPanel: nexus-ai (violet) marks
 * model-generated content ONLY. Never use it as decoration on human-authored
 * or purely numeric content (see Task: "fixed a philosophy violation where
 * violet decorated the Hours metric").
 */

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type RouteStatus = "now" | "next" | "blocked";
export type RoomStatus = "ready" | "weak";
export type Tone = "accent" | "sky" | "warn" | "danger";

// ---------------------------------------------------------------------------
// Tone maps (locked tokens — do not invent new hexes, see design system)
// ---------------------------------------------------------------------------

export const TONE_BG: Record<Tone, string> = {
  accent: "bg-nexus-accent",
  sky: "bg-nexus-sky",
  warn: "bg-nexus-warn",
  danger: "bg-nexus-danger",
};

export const TONE_SOFT: Record<Tone, string> = {
  accent: "bg-nexus-accent/15 text-nexus-accent",
  sky: "bg-nexus-sky/15 text-nexus-sky",
  warn: "bg-nexus-warn/15 text-nexus-warn",
  danger: "bg-nexus-danger/15 text-nexus-danger",
};

// ---------------------------------------------------------------------------
// KPI hero (display tier) — big value + label + semantic progress bar
// ---------------------------------------------------------------------------

export function KpiHero({
  label,
  value,
  helper,
  barPct,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  barPct: number;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-panel p-4">
      <p className="text-4xl font-bold leading-none text-nexus-text">{value}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-nexus-muted">{label}</p>
      <div className="mt-3 h-1 rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${TONE_BG[tone]}`}
          style={{ width: `${Math.max(4, Math.min(100, barPct))}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-nexus-muted">{helper}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status pill — colour + label + icon (colour is never the only signal)
// ---------------------------------------------------------------------------

export function statusMeta(
  status: RouteStatus | RoomStatus
): { tone: Tone; label: string; icon: "play" | "arrow" | "alert" | "check" } {
  switch (status) {
    case "now":
      return { tone: "accent", label: "now", icon: "play" };
    case "next":
      return { tone: "sky", label: "next", icon: "arrow" };
    case "blocked":
      return { tone: "danger", label: "blocked", icon: "alert" };
    case "ready":
      return { tone: "accent", label: "ready", icon: "check" };
    case "weak":
      return { tone: "warn", label: "weak", icon: "alert" };
  }
}

export function StatusPill({ status }: { status: RouteStatus | RoomStatus }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${TONE_SOFT[meta.tone]}`}
    >
      <PillIcon kind={meta.icon} />
      {meta.label}
    </span>
  );
}

export function PillIcon({ kind }: { kind: "play" | "arrow" | "alert" | "check" }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "play")
    return (
      <svg {...common} aria-hidden>
        <path d="M5 3l8 5-8 5z" fill="currentColor" stroke="none" />
      </svg>
    );
  if (kind === "arrow")
    return (
      <svg {...common} aria-hidden>
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    );
  if (kind === "check")
    return (
      <svg {...common} aria-hidden>
        <path d="M3 8.5l3.5 3.5L13 4" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <path d="M8 3v6M8 12.5v.5" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Route row — label + context + status pill, used for routes and room maps
// ---------------------------------------------------------------------------

export function RouteRow({
  label,
  context,
  status,
}: {
  label: string;
  context: string;
  status: RouteStatus | RoomStatus;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2 odd:bg-white/[0.02]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-nexus-text">{label}</p>
        <p className="truncate text-xs text-nexus-muted">{context}</p>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta chip — small tinted label, e.g. owner, gate type, audit status
// ---------------------------------------------------------------------------

export function MetaChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${TONE_SOFT[tone]}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Secondary link — quiet action, never competes with the one primary action
// ---------------------------------------------------------------------------

export function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-nexus-text/80 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-nexus-text"
    >
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Empty line — designed empty state for a panel's list area
// ---------------------------------------------------------------------------

export function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-nexus-border px-3 py-4 text-center text-xs text-nexus-muted">
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// AI-generated content panel — violet marker per design system (nexus-ai).
// Use ONLY for model-generated content. Human-authored content never uses
// violet — that discipline is the single most valuable signal in the product.
// ---------------------------------------------------------------------------

export function AiPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-nexus-ai/40 bg-nexus-panel p-4">
      <span className="absolute inset-y-0 left-0 w-1 bg-nexus-ai" aria-hidden />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-nexus-ai/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nexus-ai">
        AI
      </span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust card — links into the Trust Drawer / Approval Consequence patterns
// ---------------------------------------------------------------------------

export function TrustCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-panel p-4">
      <p className="text-sm font-semibold text-nexus-text">{title}</p>
      <p className="mt-1 text-xs leading-5 text-nexus-muted">{body}</p>
      <div className="mt-4">
        <SecondaryLink href={href} label={cta} />
      </div>
    </div>
  );
}
