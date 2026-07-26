import { PageShell } from "@/components/page-shell";
import { VantageDealRoomPanel } from "@/components/vantage-deal-room-panel";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function VantagePage() {
  await requireWorkspaceId("/vantage");

  return (
    <PageShell
      title="Vantage Deal Room"
      description="Deal diligence prepared from governed evidence: data-room scope, checklist coverage, red flags, advisor judgment, and IC memo handoff. Vantage prepares and cites; the investment committee decides."
    >
      <VantageDealRoomPanel />
    </PageShell>
  );
}
