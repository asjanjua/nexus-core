"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * After a Clerk organization switch, backend API routes can keep honoring the
 * previous org until the session token is refreshed (observed 2026-07-08,
 * documented in docs/RELEASE_GATE_2026-07-07.md section 10). Clerk's cookie
 * refresh poller runs on a ~50s interval, so requests fired right after a
 * switch may carry the old org claim.
 *
 * This component forces an immediate `session.touch()` (fresh token for the
 * new active org) followed by `router.refresh()` (re-runs server components
 * with the new claims) whenever the active orgId changes in-session.
 */
export function OrgSessionSync() {
  const { isLoaded, orgId } = useAuth();
  const { session } = useSession();
  const router = useRouter();
  const previousOrgId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousOrgId.current === undefined) {
      // First load: record the starting org, nothing to sync.
      previousOrgId.current = orgId ?? null;
      return;
    }
    const current = orgId ?? null;
    if (previousOrgId.current === current) return;
    previousOrgId.current = current;

    let cancelled = false;
    (async () => {
      try {
        await session?.touch();
      } catch {
        // Non-fatal: the poller will refresh the token shortly anyway.
      }
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, orgId, session, router]);

  return null;
}
