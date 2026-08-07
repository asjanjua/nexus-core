"use client";

import Link from "next/link";

/**
 * Quick Decision button — pre-fills the decision creation form
 * from executive dashboard brief. One-click from insight to action.
 */

interface QuickDecisionButtonProps {
  title?: string;
  context?: string;
}

export function QuickDecisionButton({
  title = "Create Decision from this brief",
  context,
}: QuickDecisionButtonProps) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (context) params.set("context", context);

  return (
    <Link
      href={`/decisions/new?${params.toString()}`}
      className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white/80 transition-colors"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Create Decision
    </Link>
  );
}
