import { PageShell } from "@/components/page-shell";
import { BoardRoomPanel } from "@/components/board-room-panel";

export default function BoardRoomPage() {
  return (
    <PageShell
      title="Quorum Board Room"
      description="Director-ready board intelligence: run a board-pack brief, compare it with the last board cycle, and turn the delta into human-owned decisions."
    >
      <BoardRoomPanel />
    </PageShell>
  );
}
