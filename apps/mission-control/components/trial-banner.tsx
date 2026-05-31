"use client";

/**
 * TrialBanner — shown to workspaces in 'trial' status.
 * Displays days remaining and a link to upgrade.
 * Dismissed client-side for the session only; re-appears on refresh (intentional).
 */

import { useState } from "react";

type Props = {
  trialEndsAt: string | null; // ISO string or null (no expiry set = show generic banner)
};

export function TrialBanner({ trialEndsAt }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  let message: string;
  if (trialEndsAt) {
    const msLeft = new Date(trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    if (daysLeft === 0) {
      message = "Your trial has ended. Upgrade to keep full access.";
    } else if (daysLeft === 1) {
      message = "Your trial ends tomorrow. Upgrade to continue uninterrupted access.";
    } else {
      message = `You have ${daysLeft} days left in your trial.`;
    }
  } else {
    message = "You are on a NexusAI trial. Upgrade for full pilot access.";
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm text-blue-100">
      <span>
        {message}{" "}
        <a
          href="mailto:sales@nexusai.io?subject=NexusAI+Pilot+Upgrade"
          className="font-medium underline hover:text-blue-50"
        >
          Contact us to upgrade
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-blue-200 hover:text-white"
        aria-label="Dismiss trial banner"
      >
        &times;
      </button>
    </div>
  );
}
