"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * AuthMode — from ENGINEERING_GUARDRAILS.md §2.
 *
 * Four states matching the data-locality continuum:
 *   - clerk_cloud:      Cloud storage + Cloud model (hosted, current default)
 *   - local_license:     Desktop sync + Cloud model (future Tauri Desktop)
 *   - offline_local:     Local storage + Local model (fully air-gapped)
 *   - hybrid_sync_pending: Local-first with pending cloud sync
 */

export type AuthMode =
  | { type: "clerk_cloud"; workspaceId?: string; label: string }
  | { type: "local_license"; workspaceId: string; licenseId: string; label: string }
  | { type: "offline_local"; workspaceId: string; label: string }
  | { type: "hybrid_sync_pending"; workspaceId: string; licenseId: string; label: string };

/** UI display metadata for each mode. */
export interface ModePresentation {
  /** Short label shown in the indicator badge. */
  badge: string;
  /** Tooltip / hover text describing data locality. */
  tooltip: string;
  /** Badge color variant. */
  variant: "neutral" | "local" | "offline" | "sync";
}

const MODE_PRESENTATION: Record<AuthMode["type"], ModePresentation> = {
  clerk_cloud: {
    badge: "Cloud",
    tooltip: "Data stored in cloud · Models run in cloud",
    variant: "neutral",
  },
  local_license: {
    badge: "Desktop + Cloud",
    tooltip: "Data synced to desktop · Models run in cloud",
    variant: "sync",
  },
  offline_local: {
    badge: "Local",
    tooltip: "Data stored locally · Models run locally",
    variant: "local",
  },
  hybrid_sync_pending: {
    badge: "Syncing…",
    tooltip: "Local-first with pending cloud sync",
    variant: "sync",
  },
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ModeContextValue {
  mode: AuthMode;
  presentation: ModePresentation;
}

const ModeContext = createContext<ModeContextValue>({
  mode: { type: "clerk_cloud", label: "Cloud storage · Cloud model" },
  presentation: MODE_PRESENTATION.clerk_cloud,
});

export function useMode(): ModeContextValue {
  return useContext(ModeContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Detects the current deployment mode from env.
 * In production (hosted Render), this is always clerk_cloud.
 * In future local/Tauri builds, the env var changes the mode.
 */
function detectMode(): AuthMode {
  const deployMode = process.env.NEXT_PUBLIC_NEXUS_DEPLOY_MODE?.trim();
  switch (deployMode) {
    case "local_license":
      return { type: "local_license", workspaceId: "", licenseId: "", label: "Desktop sync · Cloud model" };
    case "offline_local":
      return { type: "offline_local", workspaceId: "", label: "Local storage · Local model" };
    case "hybrid_sync_pending":
      return { type: "hybrid_sync_pending", workspaceId: "", licenseId: "", label: "Local-first · Sync pending" };
    default:
      return { type: "clerk_cloud", label: "Cloud storage · Cloud model" };
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const mode = detectMode();
  const presentation = MODE_PRESENTATION[mode.type];

  return (
    <ModeContext.Provider value={{ mode, presentation }}>
      {children}
    </ModeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Visual indicator
// ---------------------------------------------------------------------------

// Locked design-system tokens only — see nexus-design-system skill. Mode
// Indicator previously used raw Tailwind colors (emerald/amber/blue) that
// don't exist in the token set; on-prem/local is the strongest trust state
// and gets the accent (mint) token to give it real visual weight, per spec.
const VARIANT_CLASSES: Record<ModePresentation["variant"], string> = {
  neutral: "bg-white/10 text-nexus-muted border-white/10",
  local: "bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30",
  offline: "bg-nexus-warn/10 text-nexus-warn border-nexus-warn/30",
  sync: "bg-nexus-sky/10 text-nexus-sky border-nexus-sky/30",
};

/**
 * Compact badge shown beside the user button in the top bar.
 * Always visible when the user is signed in.
 */
export function ModeIndicator() {
  const { presentation } = useMode();
  const classes = VARIANT_CLASSES[presentation.variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${classes}`}
      title={presentation.tooltip}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {presentation.badge}
    </span>
  );
}
