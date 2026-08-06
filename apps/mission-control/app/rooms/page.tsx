import { PageShell } from "@/components/page-shell";
import { requireWorkspaceId } from "@/lib/safe-auth";
import { repository } from "@/lib/data/repository";
import { RoomPortfolioGrid } from "@/components/room-portfolio-grid";

export const metadata = { title: "Room Portfolio | Pinavia" };

/**
 * Room Portfolio — every workspace sees the complete curated set from day one.
 *
 * Visibility is not activation. A room must be activated by an administrator
 * who confirms the accountable owner, evidence scope, agent pack, and
 * human-authority boundary before it appears in navigation.
 *
 * The Executive Command room is mandatory and always active.
 */
export default async function RoomsPage() {
  const workspaceId = await requireWorkspaceId("/rooms");

  const rooms = await repository.listRooms(workspaceId);

  return (
    <PageShell
      title="Room Portfolio"
      description="Every room in the Nexus operating model. Activate the ones your organisation needs — each requires a named owner, evidence scope, and confirmed authority boundary."
    >
      <RoomPortfolioGrid rooms={rooms} _workspaceId={workspaceId} />
    </PageShell>
  );
}
