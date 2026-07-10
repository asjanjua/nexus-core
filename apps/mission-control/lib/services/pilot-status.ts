import type { StrategyProfile, PilotGate } from "@/lib/contracts";

/**
 * Returning-user pilot-status lane (Mission Control).
 *
 * Derives a single, unambiguous lane state from the strategy profile so the
 * dashboard card can show exactly one primary action per state (design-system
 * rule: one primary action, evidence-first, no ambiguous CTAs).
 *
 * States, in funnel order:
 *  - "start":     no profile or scorer never ran — begin readiness setup
 *  - "gated":     scorer ran, bridgeable gates still blocked
 *  - "select":    all gates clear, no workflow chosen yet
 *  - "in_motion": workflow selected — pilot paperwork/run loop is next
 */
export type PilotLaneState = "start" | "gated" | "select" | "in_motion";

export interface PilotLaneAction {
  label: string;
  href: string;
}

export interface PilotLaneStatus {
  state: PilotLaneState;
  headline: string;
  description: string;
  primaryAction: PilotLaneAction;
  secondaryActions: PilotLaneAction[];
  /** Now/Next strip: what just completed and what the next gate is. */
  now: string;
  next: string;
  blockedGates: PilotGate[];
  /** Informational scorer-signal entry (blocked: false, never gates). */
  signalGate: PilotGate | null;
}

const SIGNAL_KEY = "signal_strength";

function gatesOf(profile: StrategyProfile | null): PilotGate[] {
  return profile?.pilotGates ?? [];
}

export function derivePilotLaneStatus(
  profile: StrategyProfile | null
): PilotLaneStatus {
  const gates = gatesOf(profile);
  const blockedGates = gates.filter((gate) => gate.blocked);
  const signalGate =
    gates.find((gate) => gate.key === SIGNAL_KEY && !gate.blocked) ?? null;
  const scorerRan = gates.length > 0 || Boolean(profile?.pilotReady);

  if (!profile || !scorerRan) {
    return {
      state: "start",
      headline: "Pilot readiness not started",
      description:
        "Run the readiness check so the workflow scorer can map your lane, gates, and first pilot candidates.",
      primaryAction: { label: "Start readiness setup", href: "/start-pilot" },
      secondaryActions: [
        { label: "Preview workflow twins", href: "/workflows" },
      ],
      now: "No scorer run recorded",
      next: "Complete readiness setup",
      blockedGates,
      signalGate,
    };
  }

  if (!profile.pilotReady) {
    const gateNames = blockedGates.map((gate) => gate.label).join(", ");
    return {
      state: "gated",
      headline: "Pilot scope needs gates cleared",
      description: gateNames
        ? `Blocked: ${gateNames}. Clear these to unlock workflow selection.`
        : "The scorer has not marked this workspace pilot-ready yet. Re-run setup to refresh the gates.",
      primaryAction: { label: "Complete setup", href: "/start-pilot" },
      secondaryActions: [
        { label: "Review workflow twins", href: "/workflows" },
      ],
      now: "Scorer ran — gates open",
      next: blockedGates[0]?.label ?? "Re-run the workflow scorer",
      blockedGates,
      signalGate,
    };
  }

  if (!profile.selectedWorkflow) {
    return {
      state: "select",
      headline: "Gates clear — select your first pilot workflow",
      description:
        "Sponsor, reviewer, and evidence gates are clear. Pick the scorer-backed workflow twin to anchor the pilot.",
      primaryAction: { label: "Select workflow", href: "/workflows" },
      secondaryActions: [{ label: "Review setup", href: "/start-pilot" }],
      now: "All scorer gates clear",
      next: "Confirm first pilot workflow",
      blockedGates,
      signalGate,
    };
  }

  return {
    state: "in_motion",
    headline: `Pilot in motion: ${profile.selectedWorkflow}`,
    description:
      "Workflow confirmed with sponsor and reviewer named. Paperwork and the shadow run loop are the next gates.",
    primaryAction: { label: "Open pilot paperwork", href: "/pilot/paperwork" },
    secondaryActions: [
      { label: "Review workflow", href: "/workflows" },
      { label: "Adjust setup", href: "/start-pilot" },
    ],
    now: `Workflow selected: ${profile.selectedWorkflow}`,
    next: "Pilot paperwork and reviewer sign-off",
    blockedGates,
    signalGate,
  };
}
