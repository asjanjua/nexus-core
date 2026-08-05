"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

// ---------------------------------------------------------------------------
// Three-tier IA (locked 2026-07-25, see Figma "18 IA & States Reference"):
//   Tier 1 — Room: the Executive Room hub, always first.
//   Tier 2 — Arcs: 1. Connect · 2. Analyse · 3. Decide · 4. Prove, numbered
//            in workflow order. The numbering is the teaching mechanism.
//   Tier 3 — Spine: collapsed-by-default Workspace group (Settings et al.)
//            plus Specialist Rooms (role dashboards, drill-down surfaces).
// Hard cap: 6 top-level entries (Room + 4 arcs + collapsed spine).
// Lifecycle/admin surfaces (reviewer seat, waitlist, funnel, afterlife)
// live in the spine, not the arcs.
//
// Nav Health Badges — locked signature pattern (see nexus-design-system
// skill). Quiet counts for the four states that genuinely need a human:
// approvals pending, risks open, evidence below threshold, workflows
// blocked. Backed by /api/nav/health, which reads real records only — see
// that route's comment for exactly what each count means.
// ---------------------------------------------------------------------------

type NavHealth = {
  approvalsPending: number;
  risksOpen: number;
  evidenceBelowThreshold: number;
  workflowsBlocked: number;
};

type BadgeTone = "neutral" | "warn" | "danger";

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-white/10 text-white/50",
  warn: "bg-nexus-warn/15 text-nexus-warn",
  danger: "bg-nexus-danger/15 text-nexus-danger",
};

function NavBadge({ count, tone }: { count: number; tone: BadgeTone }) {
  if (count <= 0) return null;
  return (
    <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_TONE_CLASSES[tone]}`}>
      {count}
    </span>
  );
}

/** href -> badge, derived from the health payload. Only items with a real, verified count get one. */
function badgeFor(href: string, health: NavHealth | null): { count: number; tone: BadgeTone } | null {
  if (!health) return null;
  switch (href) {
    case "/approvals":
      return { count: health.approvalsPending, tone: "warn" };
    case "/decisions":
      return { count: health.workflowsBlocked, tone: "danger" };
    case "/sources":
      return { count: health.evidenceBelowThreshold, tone: "neutral" };
    case "/dashboard/ceo":
      return { count: health.risksOpen, tone: "danger" };
    default:
      return null;
  }
}

type NavItem = { href: string; label: string };
type NavSection = { label: string; items: NavItem[] };

/** Tier 1 — the Room. Always first, never grouped. */
const roomItem: NavItem = { href: "/dashboard/ceo", label: "Executive Room" };

/** Tier 2 — the four numbered arcs, in workflow order. */
const arcSections: NavSection[] = [
  {
    label: "1. Connect",
    items: [
      { href: "/sources", label: "Sources" },
      { href: "/ingestion", label: "Ingestion" },
      // Belongs to Connect, not Decide: the question is "what IS this document",
      // which is part of getting evidence in, not deciding anything with it.
      // Deliberately not called "Review Queue" — /review already owns that name
      // and means something else.
      { href: "/evidence/review", label: "Untyped Evidence" },
      { href: "/settings/connectors", label: "Connectors" },
    ],
  },
  {
    label: "2. Analyse",
    items: [
      { href: "/ask", label: "Ask" },
      { href: "/workflows", label: "Workflow Twins" },
      { href: "/entities", label: "Company Memory" },
      { href: "/knowledge", label: "Knowledge Workspace" },
    ],
  },
  {
    label: "3. Decide",
    items: [
      { href: "/recommendations", label: "Recommendations" },
      { href: "/approvals", label: "Approvals" },
      { href: "/decisions", label: "Decisions" },
      { href: "/review", label: "Review Queue" },
    ],
  },
  {
    label: "4. Prove",
    items: [
      { href: "/export", label: "Export Hub" },
      { href: "/export/weekly-brief", label: "Weekly Brief" },
      { href: "/export/one-pager", label: "One-Pager" },
      { href: "/pilot-kit", label: "Pilot Kit" },
      { href: "/governance/trace", label: "Governance Trace" },
    ],
  },
];

/** Tier 3 — collapsed-by-default spine groups. */
const spineSections: NavSection[] = [
  {
    label: "Specialist Rooms",
    items: [
      { href: "/dashboard/coo", label: "Operating Room" },
      { href: "/dashboard/cbo", label: "Growth Room" },
      { href: "/dashboard/cto", label: "Technology Room" },
      { href: "/dashboard/cfo", label: "Finance Room" },
      { href: "/dashboard/cro", label: "Risk Room" },
      { href: "/dashboard/chro", label: "People Room" },
      { href: "/board", label: "Board Room" },
      { href: "/meridian", label: "Submission Room" },
      { href: "/vantage", label: "Deal Room" },
      { href: "/nucleus", label: "Engagement Room" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/workspace", label: "Workspace" },
      { href: "/settings/policies", label: "Policies" },
      { href: "/reviewer-seat", label: "Reviewer Seat" },
      { href: "/pro-waitlist", label: "Nexus Pro" },
      // Funnel is operator-only by default (decision 2026-07-09). The nav entry
      // is opt-in via build-time env so customers never see a dead operator link;
      // the API enforces access regardless (NEXUS_FUNNEL_VISIBILITY).
      ...(process.env.NEXT_PUBLIC_NEXUS_FUNNEL_NAV === "visible"
        ? [{ href: "/funnel", label: "Pilot Funnel" }]
        : []),
      { href: "/pilot/afterlife", label: "Pilot Afterlife" },
    ],
  },
];

function NavLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge: { count: number; tone: BadgeTone } | null;
}) {
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
        active
          ? "border-nexus-accent/30 bg-nexus-accent/10 text-white font-medium"
          : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.045] hover:text-white",
      ].join(" ")}
    >
      <span>{item.label}</span>
      {badge && <NavBadge count={badge.count} tone={badge.tone} />}
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const [health, setHealth] = useState<NavHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/nav/health")
      .then((res) => res.json())
      .then((payload) => {
        if (!cancelled && payload.ok) setHealth(payload.data);
      })
      .catch(() => {
        // Quiet failure — badges are a convenience, not a critical path.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /** A spine group renders open if the current route lives inside it. */
  function spineGroupOpen(section: NavSection) {
    return section.items.some((item) => isActive(item.href));
  }

  const renderArcs = (
    <>
      {/* Tier 1 — Room */}
      <div>
        <NavLink item={roomItem} active={isActive(roomItem.href)} badge={badgeFor(roomItem.href, health)} />
      </div>

      {/* Tier 2 — numbered arcs */}
      {arcSections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-xs uppercase text-white/30">{section.label}</p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} badge={badgeFor(item.href, health)} />
            ))}
          </div>
        </div>
      ))}

      {/* Tier 3 — collapsed spine */}
      {spineSections.map((section) => (
        <details key={section.label} className="group/spine" open={spineGroupOpen(section)}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1 text-xs uppercase text-white/30 transition hover:text-white/50">
            <span>{section.label}</span>
            <span className="transition group-open/spine:rotate-180">⌄</span>
          </summary>
          <div className="mt-1 space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} badge={badgeFor(item.href, health)} />
            ))}
          </div>
        </details>
      ))}
    </>
  );

  return (
    <>
      <div className="border-b border-white/10 bg-[#090f1b]/95 p-3 md:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <span className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-nexus-accent text-xs text-[#04100d]">
                N
              </span>
              Nexus
            </span>
            <span className="text-white/40 transition group-open:rotate-180">⌄</span>
          </summary>
          <nav className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto rounded-lg border border-white/10 bg-[#0b1220] p-3">
            {renderArcs}
          </nav>
        </details>
      </div>

      <aside className="hidden min-h-screen w-full max-w-[17rem] shrink-0 border-r border-white/10 bg-[#090f1b]/90 p-4 md:block">
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-nexus-accent text-sm font-semibold text-[#04100d]">
            N
          </span>
          <div>
            <p className="font-semibold text-white">Nexus</p>
            <p className="text-xs text-white/40">Mission Control</p>
          </div>
        </div>
        <nav className="space-y-5">{renderArcs}</nav>
        <div className="mt-6 border-t border-white/10 pt-4">
          <LogoutButton
            label="Account"
            className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/60 transition hover:border-white/20 hover:bg-white/[0.045] hover:text-white"
          />
        </div>
      </aside>
    </>
  );
}
