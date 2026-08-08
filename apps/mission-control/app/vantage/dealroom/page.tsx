import { PageShell } from "@/components/page-shell";
import { VantageDealSetup } from "@/components/vantage-deal-setup";
import { requireWorkspaceId } from "@/lib/safe-auth";

export const metadata = { title: "Deal Room Setup | Vantage" };

/** Vantage Deal arc, screen 1. Primary user: diligence manager. */
export default async function VantageDealroomPage() {
  await requireWorkspaceId("/vantage/dealroom");
  return (
    <PageShell
      title="Deal Room Setup"
      description="Name the diligence scope, pick the checklist, and set the committee date if one exists. A deal carries no approval state — that belongs to the IC."
    >
      <VantageDealSetup />
    </PageShell>
  );
}
